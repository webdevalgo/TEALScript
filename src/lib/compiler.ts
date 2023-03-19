/* eslint-disable no-unused-vars */
import fetch from 'node-fetch';
import * as vlq from 'vlq';
import ts from 'typescript';
import * as langspec from '../langspec.json';

// This is seperate from this.getABIType because the bracket notation
// is useful for parsing, but the ABI/appspec JSON need the parens
function getABITupleString(str: string) {
  const trailingBrakcet = /(?<!\[\d*)]/;
  const leadingBracket = /\[(?!\d*])/;

  return str.replace(trailingBrakcet, ')').replace(leadingBracket, '(');
}

function stringToExpression(str: string): ts.Expression {
  if (str.startsWith('{')) {
    const srcFile = ts.createSourceFile('', `const dummy: ${str}`, ts.ScriptTarget.ES2019, true);

    const types: string[] = [];
    srcFile.statements[0].forEachChild((n) => {
      if (!ts.isVariableDeclarationList(n)) throw new Error();
      n.declarations.forEach((d) => {
        if (!ts.isTypeLiteralNode(d.type!)) throw new Error();

        d.type.members.forEach((m, i) => {
          if (!ts.isPropertySignature(m)) throw new Error();
          types.push(m.type!.getText());
        });
      });
    });

    return stringToExpression(`[${types.join(',')}]`);
  } {
    const srcFile = ts.createSourceFile('', str, ts.ScriptTarget.ES2019, true);
    return (srcFile.statements[0] as ts.ExpressionStatement).expression;
  }
}

function capitalizeFirstChar(str: string) {
  return `${str.charAt(0).toUpperCase() + str.slice(1)}`;
}

function getTypeLength(type: string): number {
  const typeNode = stringToExpression(type) as ts.Expression;
  if (type.toLowerCase().startsWith('staticarray')) {
    if (ts.isExpressionWithTypeArguments(typeNode)) {
      const innerType = typeNode!.typeArguments![0];
      const length = parseInt(typeNode!.typeArguments![1].getText(), 10);

      return length * getTypeLength(innerType.getText());
    }
  }

  if (type.match(/\[\d+]$/)) {
    const lenStr = type.match(/\[\d+]$/)![0].match(/\d+/)![0];
    const length = parseInt(lenStr, 10);
    const innerType = type.replace(/\[\d+]$/, '');
    return getTypeLength(innerType) * length;
  }

  if (type.startsWith('[')) {
    const tNode = stringToExpression(type);
    if (!ts.isArrayLiteralExpression(tNode)) throw new Error();
    let totalLength = 0;
    const types = tNode.elements.forEach((t) => {
      totalLength += getTypeLength(t.getText());
    });

    return totalLength;
  }

  if (type.match(/<\d+>$/)) {
    return parseInt(type.match(/<\d+>$/)![0].match(/\d+/)![0], 10) * getTypeLength(type.match(/\w+/)![0]);
  }

  if (type.match(/uint\d+$/)) {
    return parseInt(type.slice(4), 10) / 8;
  }
  switch (type) {
    case 'asset':
    case 'application':
      return 8;
    case 'string':
    case 'bytes':
      return 1;
    case 'account':
      return 32;
    default:
      throw new Error(`Unknown type ${JSON.stringify(type, null, 2)}`);
  }
}

// Represents the stack types available in the AVM
// eslint-disable-next-line no-shadow
enum StackType {
  none = 'void',
  uint64 = 'uint64',
  bytes = 'bytes',
  any = 'any',
}

// TODO: add VirtualType for things like tuple/array but distinct from ABI types?

// Represents the type_enum for a transaction
// eslint-disable-next-line no-shadow
enum TransactionType {
  PaymentTx = 'pay',
  KeyRegistrationTx = 'keyreg',
  AssetConfigTx = 'acfg',
  AssetTransferTx = 'axfer',
  AssetFreezeTx = 'afrz',
  ApplicationCallTx = 'appl',
  StateProofTx = 'stpf',
}

// eslint-disable-next-line no-shadow
enum ForeignType {
  Asset = 'asset',
  Account = 'account',
  Application = 'application',
}

const TXN_METHODS = [
  'sendPayment',
  'sendAppCall',
  'sendMethodCall',
  'sendAssetTransfer',
  'sendAssetCreation',
];

const CONTRACT_SUBCLASS = 'Contract';

const PARAM_TYPES: { [param: string]: string } = {
  // Account
  AcctAuthAddr: ForeignType.Account,
  // Application
  AppCreator: ForeignType.Account,
  AppAddress: ForeignType.Account,
  AssetManager: ForeignType.Account,
  AssetReserve: ForeignType.Account,
  AssetFreeze: ForeignType.Account,
  AssetClawback: ForeignType.Account,
  AssetCreator: ForeignType.Account,
  // Global
  ZeroAddress: ForeignType.Account,
  CurrentApplicationID: ForeignType.Application,
  CreatorAddress: ForeignType.Account,
  CurrentApplicationAddress: ForeignType.Account,
  CallerApplicationID: ForeignType.Application,
  CallerApplicationAddress: ForeignType.Account,
  // Txn
  Sender: ForeignType.Account,
  Receiver: ForeignType.Account,
  CloseRemainderTo: ForeignType.Account,
  XferAsset: ForeignType.Asset,
  AssetSender: ForeignType.Account,
  AssetReceiver: ForeignType.Account,
  AssetCloseTo: ForeignType.Account,
  ApplicationID: ForeignType.Application,
  RekeyTo: ForeignType.Account,
  ConfigAsset: ForeignType.Asset,
  ConfigAssetManager: ForeignType.Account,
  ConfigAssetReserve: ForeignType.Account,
  ConfigAssetFreeze: ForeignType.Account,
  ConfigAssetClawback: ForeignType.Account,
  FreezeAsset: ForeignType.Asset,
  FreezeAssetAccount: ForeignType.Account,
  CreatedAssetID: ForeignType.Asset,
  CreatedApplicationID: ForeignType.Application,
  ApplicationArgs: `ImmediateArray: ${StackType.bytes}`,
  Applications: `ImmediateArray: ${ForeignType.Application}`,
  Assets: `ImmediateArray: ${ForeignType.Asset}`,
  Accounts: `ImmediateArray: ${ForeignType.Account}`,
};

interface OpSpec {
  Opcode: number;
  Name: string;
  Size: number;
  Doc: string;
  Groups: string[];
  Args: string;
  Returns: string;
  DocExtra: string;
  ImmediateNote: string;
  ArgEnum: string[];
  ArgEnumTypes: string;
}

interface StorageProp {
  type: string;
  key?: string;
  defaultSize?: number;
  keyType: string;
  valueType: string;
  dynamicSize?: boolean;
}

interface Subroutine {
  name: string;
  returnType: string;
  decorators?: string[];
}

// These should probably be types rather than strings?
function isNumeric(t: string): boolean {
  return ['uint64', 'asset', 'application'].includes(t);
}

function isRefType(t: string): boolean {
  return ['account', 'asset', 'application'].includes(t);
}

const scratch = {
  fullTuple: '0 // full tuple',
  arrayOffset: '1 // array offset',
  fullArrayLength: '2 // full array length',
  staticPartOfTuple: '3 // static part of tuple',
  dynamicHeads: '4 // dynamic heads',
  valuesAfterArray: '5 // values after array',
  newArray: '6 // new array',
  valuesBeforeArray: '7 // values before array',
  dynamicHead: '8 // dynamic head',
  dynamicHeadOffset: '9 // dynamic head offset',
  dynamicElements: '10 // dynamic elements',
  staticElements: '11 // static elements',
  spliceStart: '12 // splice start',
  spliceByteLength: '13 // splice byte length',
};

export default class Compiler {
  teal: string[] = ['#pragma version 8', 'b main'];

  clearTeal: string[] = ['#pragma version 8'];

  generatedTeal: string = '';

  generatedClearTeal: string = '';

  private customTypes: {[name: string] : string} = {};

  private scratch: {[name: string] :{index: number; type: string}} = {};

  private frameIndex: number = 0;

  private frameSize: {[methodName: string]: number} = {};

  private subroutines: {[methodName: string]: {returnType: string, args: number}} = {};

  private clearStateCompiled: boolean = false;

  private compilingApproval: boolean = true;

  private ifCount: number = 0;

  private ternaryCount: number = 0;

  filename?: string;

  content: string;

  private processErrorNodes: ts.Node[] = [];

  private frame: {[name: string] :{index: number; type: string}} = {};

  private currentSubroutine: Subroutine = { name: '', returnType: '' };

  private bareMethods: { name: string, predicates: string[] }[] = [];

  abi: {
    name: string,
    desc: string,
    methods: {
      name: string,
      desc: string,
      args: {name: string, type: string, desc: string}[],
      returns: {type: string, desc: string},
      }[],
    } = {
      name: '', desc: '', methods: [],
    };

  private storageProps: { [key: string]: StorageProp } = {};

  private lastType: string = 'void';

  private contractClasses: string[] = [];

  name: string;

  pcToLine: { [key: number]: number } = {};

  lineToPc: { [key: number]: number[] } = {};

  private lastSourceCommentRange: [number, number] = [-1, -1];

  private comments: number[] = [];

  private typeHint?: string;

  private readonly OP_PARAMS: {
    [type: string]: {name: string, type?: string, args: number, fn: () => void}[]
  } = {
      account: [
        ...this.getOpParamObjects('acct_params_get'),
        ...this.getOpParamObjects('asset_holding_get'),
      ],
      application: [
        ...this.getOpParamObjects('app_params_get'),
        {
          name: 'Global',
          type: 'any',
          args: 2,
          fn: () => {
            this.maybeValue('app_global_get_ex', StackType.bytes);
          },
        },
      ],
      txn: this.getOpParamObjects('txn'),
      global: this.getOpParamObjects('global'),
      itxn: this.getOpParamObjects('itxn'),
      gtxns: this.getOpParamObjects('gtxns'),
      asset: this.getOpParamObjects('asset_params_get'),
    };

  private storageFunctions: {[type: string]: {[f: string]: Function}} = {
    global: {
      get: (node: ts.CallExpression) => {
        if (!ts.isPropertyAccessExpression(node.expression)) throw new Error();
        if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error();
        const name = node.expression.expression.name.getText();

        const {
          valueType, keyType, key,
        } = this.storageProps[name];

        if (key) {
          this.pushVoid(`byte "${key}"`);
        } else {
          this.processNode(node.arguments[0]);
          if (isNumeric(keyType)) this.pushVoid('itob');
        }

        this.push('app_global_get', valueType);
      },
      put: (node: ts.CallExpression) => {
        if (!ts.isPropertyAccessExpression(node.expression)) throw new Error();
        if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error();
        const name = node.expression.expression.name.getText();

        const {
          valueType, keyType, key,
        } = this.storageProps[name];

        if (key) {
          this.pushVoid(`byte "${key}"`);
        } else {
          this.processNode(node.arguments[0]);
          if (isNumeric(keyType)) this.pushVoid('itob');
        }

        if (node.arguments[key ? 0 : 1]) {
          this.processNode(node.arguments[key ? 0 : 1]);
        } else this.pushVoid('swap'); // Used when updating storage array

        this.push('app_global_put', valueType);
      },
      delete: (node: ts.CallExpression) => {
        if (!ts.isPropertyAccessExpression(node.expression)) throw new Error();
        if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error();
        const name = node.expression.expression.name.getText();

        const {
          valueType, keyType, key,
        } = this.storageProps[name];

        if (key) {
          this.pushVoid(`byte "${key}"`);
        } else {
          this.processNode(node.arguments[0]);
          if (isNumeric(keyType)) this.pushVoid('itob');
        }

        this.pushVoid('app_global_del');
      },
      exists: (node: ts.CallExpression) => {
        if (!ts.isPropertyAccessExpression(node.expression)) throw new Error();
        if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error();
        const name = node.expression.expression.name.getText();

        const {
          valueType, keyType, key,
        } = this.storageProps[name];

        this.pushVoid('txna Applications 0');

        if (key) {
          this.pushVoid(`byte "${key}"`);
        } else {
          this.processNode(node.arguments[0]);
          if (isNumeric(keyType)) this.pushVoid('itob');
        }

        this.hasMaybeValue('app_global_get_ex');
      },
    },
    local: {
      get: (node: ts.CallExpression) => {
        if (!ts.isPropertyAccessExpression(node.expression)) throw new Error();
        if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error();
        const name = node.expression.expression.name.getText();

        const {
          valueType, keyType, key,
        } = this.storageProps[name];

        this.processNode(node.arguments[0]);

        if (key) {
          this.pushVoid(`byte "${key}"`);
        } else {
          this.processNode(node.arguments[1]);
          if (isNumeric(keyType)) this.pushVoid('itob');
        }

        this.push('app_local_get', valueType);
      },
      put: (node: ts.CallExpression) => {
        if (!ts.isPropertyAccessExpression(node.expression)) throw new Error();
        if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error();
        const name = node.expression.expression.name.getText();

        const {
          valueType, keyType, key,
        } = this.storageProps[name];

        this.processNode(node.arguments[0]);

        if (key) {
          this.pushVoid(`byte "${key}"`);
        } else {
          this.processNode(node.arguments[1]);
          if (isNumeric(keyType)) this.pushVoid('itob');
        }

        if (node.arguments[key ? 1 : 2]) {
          this.processNode(node.arguments[key ? 1 : 2]);
        } else this.pushVoid('uncover 2'); // Used when updating storage array

        this.push('app_local_put', valueType);
      },
      delete: (node: ts.CallExpression) => {
        if (!ts.isPropertyAccessExpression(node.expression)) throw new Error();
        if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error();
        const name = node.expression.expression.name.getText();

        const {
          valueType, keyType, key,
        } = this.storageProps[name];

        this.processNode(node.arguments[0]);

        if (key) {
          this.pushVoid(`byte "${key}"`);
        } else {
          this.processNode(node.arguments[1]);
          if (isNumeric(keyType)) this.pushVoid('itob');
        }

        this.pushVoid('app_local_del');
      },
      exists: (node: ts.CallExpression) => {
        if (!ts.isPropertyAccessExpression(node.expression)) throw new Error();
        if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error();
        const name = node.expression.expression.name.getText();

        const {
          valueType, keyType, key,
        } = this.storageProps[name];
        this.processNode(node.arguments[0]);
        this.pushVoid('txna Applications 0');

        if (key) {
          this.pushVoid(`byte "${key}"`);
        } else {
          this.processNode(node.arguments[1]);
          if (isNumeric(keyType)) this.pushVoid('itob');
        }

        this.hasMaybeValue('app_local_get_ex');
      },
    },
    box: {
      get: (node: ts.CallExpression) => {
        if (!ts.isPropertyAccessExpression(node.expression)) throw new Error();
        if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error();
        const name = node.expression.expression.name.getText();

        const {
          valueType, keyType, key,
        } = this.storageProps[name];

        if (key) {
          this.pushVoid(`byte "${key}"`);
        } else {
          this.processNode(node.arguments[0]);
          if (isNumeric(keyType)) this.pushVoid('itob');
        }

        this.maybeValue('box_get', valueType);
        if (isNumeric(valueType)) this.pushVoid('btoi');
      },
      put: (node: ts.CallExpression) => {
        if (!ts.isPropertyAccessExpression(node.expression)) throw new Error();
        if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error();
        const name = node.expression.expression.name.getText();

        const {
          valueType, keyType, key, dynamicSize,
        } = this.storageProps[name];

        if (key) {
          this.pushVoid(`byte "${key}"`);
        } else {
          this.processNode(node.arguments[0]);
          if (isNumeric(keyType)) this.pushVoid('itob');
        }

        if (dynamicSize) this.pushLines('dup', 'box_del', 'pop');

        if (node.arguments[key ? 0 : 1]) {
          this.processNode(node.arguments[key ? 0 : 1]);
        } else this.pushVoid('swap'); // Used when updating storage array

        if (isNumeric(valueType)) this.pushVoid('itob');

        this.push('box_put', valueType);
      },
      delete: (node: ts.CallExpression) => {
        if (!ts.isPropertyAccessExpression(node.expression)) throw new Error();
        if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error();
        const name = node.expression.expression.name.getText();

        const {
          valueType, keyType, key,
        } = this.storageProps[name];

        if (key) {
          this.pushVoid(`byte "${key}"`);
        } else {
          this.processNode(node.arguments[0]);
          if (isNumeric(keyType)) this.pushVoid('itob');
        }

        this.pushVoid('box_del');
      },
      exists: (node: ts.CallExpression) => {
        if (!ts.isPropertyAccessExpression(node.expression)) throw new Error();
        if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error();
        const name = node.expression.expression.name.getText();

        const {
          valueType, keyType, key,
        } = this.storageProps[name];

        if (key) {
          this.pushVoid(`byte "${key}"`);
        } else {
          this.processNode(node.arguments[0]);
          if (isNumeric(keyType)) this.pushVoid('itob');
        }

        this.hasMaybeValue('box_get');
      },
    },
  };

  private andCount: number = 0;

  private orCount: number = 0;

  private sourceFile: ts.SourceFile;

  private nodeDepth: number = 0;

  private topLevelNode!: ts.Node;

  private multiplyWideRatioFactors(factors: ts.Expression[]) {
    if (factors.length === 1) {
      this.pushVoid('int 0');
      this.processNode(factors[0]);
    } else {
      this.processNode(factors[0]);
      this.processNode(factors[1]);
      this.pushVoid('mulw');
    }

    factors.slice(2).forEach((f) => {
      this.processNode(f);

      /*
      https://github.com/algorand/pyteal/blob/d117f99c07a64cddf6de21b72232df12b53fdbbb/pyteal/ast/widemath.py#LL12C8-L12C8

      stack is [..., A, B, C], where C is current factor
      need to pop all A,B,C from stack and push X,Y, where X and Y are:
            X * 2**64 + Y = (A * 2**64 + B) * C
      <=>   X * 2**64 + Y = A * C * 2**64 + B * C
      <=>   X = A * C + highword(B * C)
            Y = lowword(B * C)

      TealOp(expr, Op.uncover, 2),  # stack: [..., B, C, A]
      TealOp(expr, Op.dig, 1),  # stack: [..., B, C, A, C]
      TealOp(expr, Op.mul),  # stack: [..., B, C, A*C]
      TealOp(expr, Op.cover, 2),  # stack: [..., A*C, B, C]
      TealOp(
          expr, Op.mulw
      ),  # stack: [..., A*C, highword(B*C), lowword(B*C)]
      TealOp(
          expr, Op.cover, 2
      ),  # stack: [..., lowword(B*C), A*C, highword(B*C)]
      TealOp(
          expr, Op.add
      ),  # stack: [..., lowword(B*C), A*C+highword(B*C)]
      TealOp(
          expr, Op.swap
      ),  # stack: [..., A*C+highword(B*C), lowword(B*C)]
      */

      this.pushLines(
        'uncover 2',
        'dig 1',
        '*',
        'cover 2',
        'mulw',
        'cover 2',
        '+',
        'swap',
      );
    });
  }

  private customMethods: { [methodName: string]: (node: ts.CallExpression) => void } = {
    wideRatio: (node: ts.CallExpression) => {
      if (
        node.arguments.length !== 2
        || !ts.isArrayLiteralExpression(node.arguments[0])
        || !ts.isArrayLiteralExpression(node.arguments[1])
      ) throw new Error();

      this.multiplyWideRatioFactors(new Array(...node.arguments[0].elements));
      this.multiplyWideRatioFactors(new Array(...node.arguments[1].elements));

      this.pushLines(
        'divmodw',
        'pop',
        'pop',
        'swap',
        '!',
        'assert',
      );

      this.lastType = 'uint64';
    },

  };

  constructor(content: string, className: string, filename?: string) {
    this.filename = filename;
    this.content = content;
    this.name = className;
    this.sourceFile = ts.createSourceFile(this.filename || '', this.content, ts.ScriptTarget.ES2019, true);
  }

  getOpParamObjects(op: string) {
    const opSpec = langspec.Ops.find((o) => o.Name === op);
    if (opSpec === undefined) {
      throw new Error(`Unknown op ${op}`);
    }

    return opSpec.ArgEnum!.map((arg, i) => {
      let fn;
      const type = PARAM_TYPES[arg]
        || opSpec.ArgEnumTypes![i].replace('B', StackType.bytes).replace('U', StackType.uint64);

      if (['txn', 'global', 'itxn', 'gtxns'].includes(op)) {
        fn = () => this.push(`${op} ${arg}`, type);
      } else {
        fn = () => this.maybeValue(`${op} ${arg}`, type);
      }
      return {
        name: arg,
        args: opSpec.Args?.length || 0,
        fn,
      };
    });
  }

  private isDynamicType(type: string): boolean {
    if (this.customTypes[type]) return this.isDynamicType(this.customTypes[type]);

    return type.includes('[]') || type.includes('string') || type.includes('bytes');
  }

  private getABIType(type: string): string {
    if (this.customTypes[type]) return type;
    const abiType = type.toLowerCase();
    const typeNode = stringToExpression(type) as ts.Expression;

    if (abiType.match(/<\d+>$/)) {
      return `${abiType.match(/\w+/)![0]}[${abiType.match(/<\d+>$/)![0].match(/\d+/)![0]}]`;
    }

    if (abiType.startsWith('static')) {
      if (!ts.isExpressionWithTypeArguments(typeNode)) throw new Error();
      const innerType = typeNode!.typeArguments![0];
      const length = parseInt(typeNode!.typeArguments![1].getText(), 10);

      return `${this.getABIType(innerType.getText())}[${length}]`;
    }

    if (abiType.match(/\[\]$/)) {
      const baseType = abiType.replace(/\[\]$/, '');
      return `${this.getABIType(baseType)}[]`;
    }

    if (abiType.startsWith('[')) {
      if (!ts.isArrayLiteralExpression(typeNode)) throw new Error();

      return `[${typeNode.elements.map((t) => this.getABIType(t.getText())).join(',')}]`;
    }

    return abiType;
  }

  private getObjectTypeAndIndex(givenType: string, key: string): {type: string; index: number} {
    let type = givenType;

    if (this.customTypes[type]) {
      type = this.customTypes[type];
    }

    const statement = ts.createSourceFile('', `const dummy: ${type};`, ts.ScriptTarget.ES2019, true).statements[0];

    let retVal = { type: '', index: 0 };

    statement.forEachChild((n) => {
      if (!ts.isVariableDeclarationList(n)) throw new Error();
      n.declarations.forEach((d) => {
        if (!ts.isTypeLiteralNode(d.type!)) throw new Error();

        d.type.members.forEach((m, i) => {
          if (!ts.isPropertySignature(m)) throw new Error();
          if (m.name.getText() === key) retVal = { index: i, type: m.type!.getText() };
        });
      });
    });

    return retVal;
  }

  async compile() {
    this.sourceFile.statements.forEach((body) => {
      if (ts.isTypeAliasDeclaration(body)) {
        this.customTypes[body.name.getText()] = body.type.getText();
      }

      if (!ts.isClassDeclaration(body)) return;

      if (
        body.heritageClauses === undefined
        || !ts.isIdentifier(body.heritageClauses[0].types[0].expression)
      ) return;

      if (body.heritageClauses[0].types[0].expression.text === CONTRACT_SUBCLASS) {
        const className = body.name!.text;
        this.contractClasses.push(className);

        if (className === this.name) {
          this.abi = {
            name: className, desc: '', methods: [],
          };

          this.processNode(body);
        }
      }
    });

    if (!this.teal.includes('main:')) {
      this.pushVoid('main:');
      this.routeAbiMethods();
    }

    Object.keys(this.compilerSubroutines).forEach((sub) => {
      if (this.teal.includes(`callsub ${sub}`)) {
        this.teal.splice(2, 0, ...this.compilerSubroutines[sub]());
      }
    });

    this.teal = await Promise.all(
      this.teal.map(async (t) => {
        if (t.startsWith('PENDING_COMPILE')) {
          const c = new Compiler(this.content, t.split(' ')[1], this.filename);
          await c.compile();
          const program = await c.algodCompile();
          return `byte b64 ${program}`;
        }

        if (t.startsWith('PENDING_DUPN')) {
          const method = t.split(' ')[1];
          return `dupn ${this.frameSize[method] - this.subroutines[method].args}`;
        }

        if (t.startsWith('PENDING_PROTO')) {
          const method = t.split(' ')[1];
          const isAbi = this.abi.methods.map((m) => m.name).includes(method);
          return `proto ${this.frameSize[method]} ${this.subroutines[method].returnType === 'void' || isAbi ? 0 : 1}`;
        }

        return t;
      }),
    );

    this.abi.methods = this.abi.methods.map((m) => ({
      ...m,
      args: m.args.map((a) => ({ ...a, type: getABITupleString(a.type) })),
      returns: { ...m.returns, type: getABITupleString(m.returns.type) },
    }));
  }

  private push(teal: string, type: string) {
    if (this.compilingApproval) {
      this.teal.push(teal);
      if (type !== 'void') this.lastType = type;
    } else {
      this.clearTeal.push(teal);
      if (type !== 'void') this.lastType = type;
    }
  }

  private pushVoid(teal: string) {
    this.push(teal, 'void');
  }

  private pushMethod(name: string, args: string[], returns: string) {
    const abiArgs = args.map((a) => getABITupleString(a));

    let abiReturns = returns;

    switch (abiReturns) {
      case 'application':
        abiReturns = 'uint64';
        break;
      case 'account':
        abiReturns = 'address';
        break;
      default:
        break;
    }

    const sig = `${name}(${abiArgs.join(',')})${getABITupleString(abiReturns)}`;
    this.pushVoid(`method "${sig}"`);
  }

  private routeAbiMethods() {
    this.pushVoid('txn NumAppArgs');
    this.pushVoid('bnz route_abi');

    // Route the bare methods with no args
    this.bareMethods.forEach((m) => {
      m.predicates.forEach((p: string) => {
        this.pushVoid(p);
      });
    });

    this.pushVoid('int 1');
    this.pushVoid(
      `match ${this.bareMethods
        .map((m) => `bare_route_${m.name}`)
        .join(' ')}`,
    );

    this.pushVoid('route_abi:');
    // Route the abi methods with args
    this.abi.methods.forEach((m) => {
      this.pushMethod(
        m.name,
        m.args.map((a) => a.type),
        m.returns.type,
      );
    });
    this.pushVoid('txna ApplicationArgs 0');
    this.pushVoid(
      `match ${this.abi.methods
        .map((m) => `abi_route_${m.name}`)
        .join(' ')}`,
    );
  }

  private maybeValue(opcode: string, type: string) {
    this.pushVoid(opcode);
    this.push('assert', type);
  }

  private hasMaybeValue(opcode: string) {
    this.pushVoid(opcode);
    this.pushVoid('swap');
    this.push('pop', StackType.uint64);
  }

  private pushComments(node: ts.Node) {
    const commentRanges = [
      ...(ts.getLeadingCommentRanges(this.sourceFile.text, node.pos) || []),
      ...(ts.getTrailingCommentRanges(this.sourceFile.text, node.pos) || []),
    ];
    commentRanges.forEach((c) => {
      const comment = this.sourceFile.text.slice(c.pos, c.end);
      if (comment.startsWith('///') && !this.comments.includes(c.pos)) {
        this.pushVoid(comment.replace('///', '//'));
        this.comments.push(c.pos);
      }
    });
  }

  private processNode(node: ts.Node) {
    this.pushComments(node);

    let isTopLevelNode = false;

    if (
      !ts.isClassDeclaration(node)
      && !ts.isMethodDeclaration(node)
      && !ts.isBlock(node)
      && !ts.isExpressionStatement(node)
      && !ts.isNonNullExpression(node)
    ) {
      if (this.nodeDepth === 0) {
        this.topLevelNode = node;
        isTopLevelNode = true;
      }
      this.nodeDepth += 1;
    }

    try {
      if (ts.isClassDeclaration(node)) this.processClassDeclaration(node);
      else if (ts.isPropertyDeclaration(node)) this.processPropertyDefinition(node);
      else if (ts.isMethodDeclaration(node)) this.processMethodDefinition(node);
      else if (ts.isPropertyAccessExpression(node)) this.processMemberExpression(node);
      else if (ts.isAsExpression(node)) this.processTSAsExpression(node);
      else if (ts.isNewExpression(node)) this.processNewExpression(node);
      else if (ts.isArrayLiteralExpression(node)) this.processArrayLiteralExpression(node);
      else if (ts.isNonNullExpression(node)) this.processNode(node.expression);
      else if (ts.isObjectLiteralExpression(node)) this.processObjectLiteralExpression(node);
      else if (node.kind === 108) this.lastType = 'this';

      // Vars/Consts
      else if (ts.isIdentifier(node)) this.processIdentifier(node);
      else if (ts.isVariableDeclarationList(node)) this.processVariableDeclaration(node);
      else if (ts.isVariableDeclaration(node)) this.processVariableDeclarator(node);
      else if (ts.isNumericLiteral(node) || ts.isStringLiteral(node)) this.processLiteral(node);

      // Logical
      else if (ts.isBlock(node)) this.processBlockStatement(node);
      else if (ts.isIfStatement(node)) this.processIfStatement(node);
      else if (ts.isPrefixUnaryExpression(node)) this.processUnaryExpression(node);
      else if (ts.isBinaryExpression(node)) this.processBinaryExpression(node);
      else if (ts.isCallExpression(node)) this.processCallExpression(node);
      else if (ts.isExpressionStatement(node)) this.processExpressionStatement(node);
      else if (ts.isReturnStatement(node)) this.processReturnStatement(node);
      else if (ts.isParenthesizedExpression(node)) this.processNode((node).expression);
      else if (ts.isVariableStatement(node)) this.processNode((node).declarationList);
      else if (ts.isElementAccessExpression(node)) this.processElementAccessExpression(node);
      else if (ts.isConditionalExpression(node)) this.processConditionalExpression(node);
      else throw new Error(`Unknown node type: ${ts.SyntaxKind[node.kind]} (${node.kind})`);
    } catch (e) {
      if (!(e instanceof Error)) throw e;

      this.processErrorNodes.push(node);

      const errNode = this.processErrorNodes[0];
      const loc = ts.getLineAndCharacterOfPosition(this.sourceFile, errNode.pos);
      const lines: string[] = [];
      errNode.getText().split('\n').forEach((l: string, i: number) => {
        lines.push(`${this.filename}:${loc.line + i + 1}: ${l}`);
      });

      const msg = `TEALScript can not process ${ts.SyntaxKind[errNode.kind]} at ${this.filename}:${loc.line}:${loc.character}\n    ${lines.join('\n    ')}\n`;

      e.message = `${e.message.replace(`\n${msg}`, '')}\n${msg}`;

      throw e;
    }

    if (isTopLevelNode) this.nodeDepth = 0;
  }

  private processObjectLiteralExpression(node: ts.ObjectLiteralExpression) {
    const type = this.typeHint;
    if (type === undefined) throw new Error();
    const typeArray: string[] = [];
    const valueArray: string[] = [];

    node.properties.forEach((p) => {
      if (!ts.isPropertyAssignment(p)) throw new Error();
      const r = this.getObjectTypeAndIndex(type, p.name.getText());
      typeArray[r.index] = r.type;
      valueArray[r.index] = p.initializer.getText();
    });

    this.typeHint = `[${typeArray.join(',')}]`;
    const tupleNode = stringToExpression(`[${valueArray.join(',')}]`);
    if (!ts.isArrayLiteralExpression(tupleNode)) throw new Error();
    this.processArrayLiteralExpression(tupleNode);
    this.lastType = type.replace(/\s+/g, ' ');
  }

  private processConditionalExpression(node: ts.ConditionalExpression) {
    this.processNode(node.condition);
    this.pushVoid(`bz ternary${this.ternaryCount}_false`);
    this.processNode(node.whenTrue);
    this.pushVoid(`b ternary${this.ternaryCount}_end`);
    this.pushVoid(`ternary${this.ternaryCount}_false:`);
    this.processNode(node.whenFalse);
    this.pushVoid(`ternary${this.ternaryCount}_end:`);

    this.ternaryCount += 1;
  }

  private pushLines(...lines: string[]) {
    lines.forEach((l) => this.push(l, 'void'));
  }

  private getTypes(typeString: string): {static: string[], dynamic: string[]} {
    const abiType = this.getABIType(typeString);
    const typeNode = stringToExpression(abiType);
    const staticLengthRegex = /(\[\d+\])+$/;
    const types: {static: string[], dynamic: string[]} = { static: [], dynamic: [] };

    if (abiType === 'string') {
      types.dynamic.push('string');
    } else if (abiType.match(staticLengthRegex)) {
      const baseType = abiType.replace(staticLengthRegex, '');

      let count: number = 1;
      abiType.match(staticLengthRegex)![0].match(/\d+/g)!.forEach((n) => {
        count *= parseInt(n, 10);
      });

      types.static.push(...Array(count).fill(this.getTypes(baseType).static));
    } else if (ts.isTupleTypeNode(typeNode) || ts.isArrayLiteralExpression(typeNode)) {
      typeNode.elements.forEach((e) => {
        const innerTypes = this.getTypes(e.getText());
        types.static.push(...innerTypes.static);
        types.dynamic.push(...innerTypes.dynamic);
      });
    } else if (ts.isIdentifier(typeNode)) {
      types.static.push(typeNode.getText());
    } else if (ts.isElementAccessExpression(typeNode)) {
      const dynamicArrayRegex = /\[\]$/;
      const baseType = typeString.replace(dynamicArrayRegex, '');
      if (baseType.match(dynamicArrayRegex)) throw new Error('Nested dynamic types not supported');
      types.dynamic.push(baseType);
    } else throw new Error(`${ts.SyntaxKind[typeNode.kind]} ${typeNode.getText()}`);

    return { static: types.static.flat(), dynamic: types.dynamic };
  }

  private getArrayNodes(node: ts.ArrayLiteralExpression): ts.Node[] {
    const nodes: ts.Node[] = [];

    node.elements.forEach((e) => {
      if (ts.isArrayLiteralExpression(e)) {
        nodes.push(...this.getArrayNodes(e));
      } else {
        nodes.push(e);
      }
    });

    return nodes.flat();
  }

  private processStaticArrayElement(
    e: ts.Node,
    type: string,
    isLast: boolean,
    context: {bytesOnStack: boolean, hexString: string},
  ) {
    const length = getTypeLength(type);

    if (ts.isNumericLiteral(e)) {
      context.hexString += parseInt(e.getText(), 10).toString(16).padStart(length * 2, '0');

      if (isLast) {
        this.pushVoid(`byte 0x${context.hexString}`);
        if (context.bytesOnStack) this.pushVoid('concat');
      }

      return;
    }

    if (context.hexString.length > 0) {
      this.pushVoid(`byte 0x${context.hexString}`);
      if (context.bytesOnStack) this.pushVoid('concat');
      context.bytesOnStack = true;

      context.hexString = '';
    }

    this.processNode(e);
    if (isNumeric(this.lastType)) this.pushVoid('itob');

    if (this.lastType.match(/uint\d+$/) && this.lastType !== type) {
      this.fixBitWidth(parseInt(type.match(/\d+/)![0], 10), !ts.isNumericLiteral(e));
    }

    if (context.bytesOnStack) this.pushVoid('concat');

    context.bytesOnStack = true;
  }

  private processArrayLiteralExpression(node: ts.ArrayLiteralExpression) {
    const types = this.getTypes(this.typeHint!);
    const nodes = this.getArrayNodes(node);

    const context = { bytesOnStack: false, hexString: '' };
    if (types.static.length === 0 && types.dynamic.length === 1) {
      const baseType = types.dynamic[0];

      if (baseType.startsWith('[')) {
        const innerTypes = this.getTypes(baseType).static;
        context.hexString = (nodes.length / innerTypes.length).toString(16).padStart(4, '0');

        nodes.forEach((e, i) => {
          this.processStaticArrayElement(
            e,
            innerTypes[i % innerTypes.length],
            i === nodes.length - 1,
            context,
          );
        });
      } else {
        context.hexString = (nodes.length).toString(16).padStart(4, '0');

        nodes.forEach((e, i) => {
          this.processStaticArrayElement(e, baseType, i === nodes.length - 1, context);
        });
      }

      this.lastType = this.getABIType(this.typeHint!);
      return;
    }

    // Process static elements
    // TODO: Throw error if size is wrong
    nodes.slice(0, types.static.length).forEach((e, i) => {
      this.processStaticArrayElement(
        e,
        types.static[i],
        i === types.static.length - 1,
        context,
      );
    });

    if (types.dynamic.length === 0) {
      this.lastType = this.getABIType(this.typeHint!);
      return;
    }

    // Process dynamic elements
    // TODO: Optimize this when there are literal dynamic elements
    const staticLen = types.static.map((m) => getTypeLength(m)).reduce((a, b) => a + b, 0);

    if (staticLen === 0) this.pushVoid('byte 0x // no static elements');

    const headEnd = staticLen + (2 * types.dynamic.length);
    this.pushLines(
      `store ${scratch.staticElements}`,
      `byte 0x${headEnd.toString(16).padStart(4, '0')} // head end`,
      `store ${scratch.dynamicHead}`,
      `int ${headEnd}`,
      `store ${scratch.dynamicHeadOffset}`,
      'byte 0x',
      `store ${scratch.dynamicElements}`,
    );

    node.elements.slice(-types.dynamic.length).forEach((e, i) => {
      if (ts.isArrayLiteralExpression(e)) {
        const baseType = types.dynamic[i];
        const innerTypes = this.getTypes(baseType);
        const innerNodes = this.getArrayNodes(e);

        innerNodes.forEach((n, j) => {
          const type = innerTypes.static[j % innerTypes.static.length];

          this.processNode(n);
          if (isNumeric(this.lastType)) this.pushVoid('itob');

          if (this.lastType.match(/uint\d+$/) && this.lastType !== type) {
            this.fixBitWidth(parseInt(type.match(/\d+/)![0], 10), !ts.isNumericLiteral(n));
          }

          if (j) this.pushVoid('concat');
        });

        this.pushLines(
          `byte 0x${e.elements.length.toString(16).padStart(4, '0')}`,
          'swap',
          'concat',
        );
      } else if (types.dynamic[i] === 'string') {
        if (ts.isStringLiteral(e)) {
          const len = e.text.length.toString(16).padStart(4, '0');
          const val = Buffer.from(e.text, 'utf-8').toString('hex');
          this.push(`byte 0x${len}${val} // ${e.text}`, 'string');
        } else this.processNode(e);

        if (this.lastType === StackType.bytes) {
          this.pushLines(
            'dup',
            'len',
            'itob',
            'extract 6 2',
            'swap',
            'concat',
          );
          this.lastType = 'string';
        }
      } else {
        this.processNode(e);
        const expectedType = `${types.dynamic[i]}[]`;
        if (expectedType !== this.lastType) throw new Error(`Expected type of ${expectedType}, but got ${this.lastType}`);
      }

      // update head if not last element
      if (i !== types.dynamic.length - 1) {
        this.pushLines(
          'dup',
          'len',
          `load ${scratch.dynamicHeadOffset}`,
          '+',
          'dup',
          `store ${scratch.dynamicHeadOffset}`,
          'itob',
          'extract 6 2',
          `load ${scratch.dynamicHead}`,
          'swap',
          'concat',
          `store ${scratch.dynamicHead}`,
        );
      }

      this.pushLines(
        `load ${scratch.dynamicElements}`,
        'swap',
        'concat',
        `store ${scratch.dynamicElements}`,
      );
    });

    this.pushLines(
      `load ${scratch.staticElements}`,
      `load ${scratch.dynamicHead}`,
      `load ${scratch.dynamicElements}`,
      'concat',
      'concat',
    );
    this.lastType = this.getABIType(this.typeHint!);
  }

  private getAccessChain(
    node: ts.ElementAccessExpression,
    chain: ts.ElementAccessExpression[] = [],
  ) {
    chain.push(node);

    if (ts.isElementAccessExpression(node.expression)) {
      this.getAccessChain(node.expression, chain);
    }

    return chain;
  }

  private updateValue(node: ts.Node) {
    // Add back to frame/storage if necessary
    if (ts.isIdentifier(node)) {
      const name = node.getText();
      const { index, type } = this.frame[name];
      this.pushVoid(`frame_bury ${index} // ${name}: ${type}`);
    } else if (
      ts.isCallExpression(node)
                && ts.isPropertyAccessExpression(node.expression)
                && ts.isPropertyAccessExpression(node.expression.expression)
                && Object.keys(this.storageProps).includes(
                  node.expression.expression?.name?.getText(),
                )
    ) {
      const storageProp = this.storageProps[
        node.expression.expression.name.getText()
      ];

      this.storageFunctions[storageProp.type].put(node);
    } else {
      throw new Error(`Can't update ${ts.SyntaxKind[node.kind]} array`);
    }
  }

  private compilerSubroutines: {[name: string]: () => string[]} = {
    updateDynamicElement: () => {
      const frame = {
        newArray: '-8 // newArray', // already on stack
        startOfHeads: '-2 // startOfHeads', // startOfHeads
        totalHeadLength: '-3 // totalHeadLength', // types.dynamic.length * 2;
        lastDynamicElement: '-4 // lastDynamicElement', // dynamicTypeIndex === types.dynamic.length - 1
        firstDynamicElement: '-5 // firstDynamicElement', // dynamicTypeIndex === 0
        headUpdateBitmask: '-6 // headUpdateBitmask', // `byte 0x${'0000'.repeat(types.dynamic.slice(0, dynamicTypeIndex + 1).length) + 'FFFF'.repeat(types.dynamic.slice(dynamicTypeIndex + 1).length)}`,
        fullHeadBitmask: '-7 // fullHeadBitmask', // `byte 0x${'FFFF'.repeat(types.dynamic.length)}`,
        headEnd: '-1 // headEnd', // startOfHeads + totalHeadLength
      };

      const subTeal = [
        'updateDynamicElement:',
        'proto 8 1',
        `frame_dig ${frame.newArray}`,
      ];

      subTeal.push(
        `store ${scratch.newArray}`,
        // get static part of tuple
        `load ${scratch.fullTuple}`,
        'int 0',
        `frame_dig ${frame.startOfHeads}`,
        'extract3',
        `store ${scratch.staticPartOfTuple}`,
        // get dynamic heads
        `load ${scratch.fullTuple}`,
        `frame_dig ${frame.startOfHeads}`,
        `frame_dig ${frame.totalHeadLength}`,
        'extract3 ',
        `store ${scratch.dynamicHeads}`,
        'byte 0x',
        'dup',
        `store ${scratch.valuesAfterArray}`,
        `store ${scratch.valuesBeforeArray}`,

        // Get values AFTER the updated array
        `frame_dig ${frame.lastDynamicElement}`,
        'bnz skip_values_after_array',
        `load ${scratch.fullTuple}`,
        `load ${scratch.arrayOffset}`,
        `load ${scratch.fullArrayLength}`,
        '+',
        `load ${scratch.fullTuple}`,
        'len',
        'substring3',
        `store ${scratch.valuesAfterArray}`,
        'skip_values_after_array:',
        // Get values BEFORE the updated array
        `frame_dig ${frame.firstDynamicElement}`,
        'bnz skip_values_before_array',
        `load ${scratch.fullTuple}`,
        `frame_dig ${frame.headEnd}`,
        `load ${scratch.arrayOffset}`,
        'substring3',
        `store ${scratch.valuesBeforeArray}`,
        'skip_values_before_array:',

        // Update dynamic heads
        `load ${scratch.dynamicHeads}`,
        `frame_dig ${frame.headUpdateBitmask}`,

        `load ${scratch.newArray}`,
        'len',
        `load ${scratch.fullArrayLength}`,
        `load ${scratch.newArray}`,
        'len',
        `load ${scratch.fullArrayLength}`,
        '>=',
        'bnz skip_len_swap',
        'swap',
        'skip_len_swap:',
        '-',

        'itob',
        'extract 6 2',
        'dup',
        'concat', // 4
        'dup',
        'concat', // 8
        'dup',
        'concat', // 16
        'dup',
        'concat', // 32
        'dup',
        'concat', // 64
        'b&',

        `load ${scratch.newArray}`,
        'len',
        `load ${scratch.fullArrayLength}`,
        '>=', // if this is true, subtract
        'bnz add_head',
        'b-',
        'b sub_or_add_head_end',
        'add_head:',
        'b+',
        'sub_or_add_head_end:',

        `frame_dig ${frame.fullHeadBitmask}`,
        'b&',
        `store ${scratch.dynamicHeads}`,
        // form new array
        `load ${scratch.staticPartOfTuple}`,
        `load ${scratch.dynamicHeads}`,
        `load ${scratch.valuesBeforeArray}`,
        `load ${scratch.newArray}`,
        `load ${scratch.valuesAfterArray}`,
        'concat',
        'concat',
        'concat',
        'concat',
        'retsub',
      );

      return subTeal;
    },
    preArrayAccess: () => {
      const frame = {
        headOffset: '-1 // head offset',
        typeLength: '-2 // type length',
        fullTuple: '-3 // full tuple',
      };

      return [
        'preArrayAccess:',
        'proto 3 0',
        `frame_dig ${frame.fullTuple}`,
        `store ${scratch.fullTuple}`,
        `load ${scratch.fullTuple}`,
        `frame_dig ${frame.headOffset}`,
        'extract_uint16 // extract array offset',
        `store ${scratch.arrayOffset}`,
        `load ${scratch.fullTuple}`,
        `load ${scratch.arrayOffset}`,
        'extract_uint16 // extract array length',
        `frame_dig ${frame.typeLength}`,
        '* // array size',
        'int 2',
        '+ // array size + len',
        `store ${scratch.fullArrayLength}`,
        'retsub',
      ];
    },
  };

  private processStaticArray(node: ts.ElementAccessExpression, newValue?: ts.Node): void {
    const chain = this.getAccessChain(node).reverse();

    let offset = 0;
    let type: string = '';
    let intsOnStack = false;

    this.processNode(chain[0].expression);
    if (this.customTypes[this.lastType]) {
      this.lastType = this.customTypes[this.lastType];
    }

    const lastTypeExpression = stringToExpression(this.lastType);

    if (ts.isArrayLiteralExpression(lastTypeExpression)) {
      const accessor = parseInt(chain[0].argumentExpression.getText(), 10);
      const accessedType = lastTypeExpression.elements[accessor].getText();

      if (accessedType.endsWith('[]') || accessedType === 'string') {
        const types = this.getTypes(this.lastType);

        const numStaticElements = lastTypeExpression.elements.length - types.dynamic.length;
        const dynamicTypeIndex = accessor - numStaticElements;

        let headOffset = 0;
        headOffset += types.static.reduce((a, b) => a + getTypeLength(b), 0);

        const startOfHeads = headOffset;

        headOffset += (dynamicTypeIndex) * 2;

        this.pushLines(
          `int ${getTypeLength(accessedType.replace(/\[\]$/, ''))} // type length`,
          `int ${headOffset} // head offset`,
          'callsub preArrayAccess',
        );

        if (newValue === undefined) {
          this.pushLines(
            `load ${scratch.fullTuple}`,
            `load ${scratch.arrayOffset}`,
            `load ${scratch.fullArrayLength}`,
            'extract3',
          );

          if (accessedType === 'string') {
            this.push('extract 2 0 // extract bytes from string', 'bytes');
          } else this.lastType = accessedType;
        } else {
          if (ts.isStringLiteral(newValue)) {
            const len = newValue.text.length.toString(16).padStart(4, '0');
            const val = Buffer.from(newValue.text, 'utf-8').toString('hex');
            this.push(`byte 0x${len}${val} // ${newValue.text}`, 'string');
          } else this.processNode(newValue);

          if (this.lastType === StackType.bytes) {
            this.pushLines(
              'dup',
              'len',
              'itob',
              'extract 6 2',
              'swap',
              'concat',
            );
          }

          const totalHeadLength = types.dynamic.length * 2;
          this.pushLines(
            `byte 0x${'FFFF'.repeat(types.dynamic.length)}`,
            `byte 0x${'0000'.repeat(types.dynamic.slice(0, dynamicTypeIndex + 1).length) + 'FFFF'.repeat(types.dynamic.slice(dynamicTypeIndex + 1).length)} // head update bitmask`,
            `int ${dynamicTypeIndex === 0 ? 1 : 0} // is first dynamic element`,
            `int ${dynamicTypeIndex === types.dynamic.length - 1 ? 1 : 0} // is last dynamic element`,
            `int ${totalHeadLength} // total head length`,
            `int ${startOfHeads} // startOfHeads`,
            `int ${startOfHeads + totalHeadLength} // head end`,
            'callsub updateDynamicElement',
          );

          this.updateValue(chain[0].expression);
        }

        return;
      }
    }

    chain.forEach((e) => {
      const baseExpressionType = this.getStackTypeFromNode(e.expression);

      if (baseExpressionType.match(/\[\d+\]$/)) {
        type = baseExpressionType.replace(/\[\d+\]$/, '');

        if (ts.isNumericLiteral(e.argumentExpression)) {
          offset += getTypeLength(type) * parseInt(e.argumentExpression.getText(), 10);
        } else {
          this.processNode(e.argumentExpression);

          if (intsOnStack) {
            this.pushVoid('+');
            intsOnStack = false;
          }

          this.pushLines(`int ${getTypeLength(type)}`, '*');
          intsOnStack = true;
        }
      } else if (baseExpressionType.match(/\[\]$/)) {
        type = baseExpressionType.replace(/\[\]$/, '');

        this.processNode(e.argumentExpression);

        this.pushLines(`int ${getTypeLength(type)}`, '*', 'int 2', '+');

        intsOnStack = true;
      } else if (baseExpressionType.startsWith('[')) {
        const typeExpression = stringToExpression(baseExpressionType);
        if (!ts.isArrayLiteralExpression(typeExpression)) throw new Error();

        const innerTypes = typeExpression.elements.map((t) => t.getText());
        const accessor = parseInt(e.argumentExpression.getText(), 10);

        innerTypes.forEach((t, i) => {
          if (i < accessor) {
            offset += getTypeLength(this.getABIType(t));
          } else if (i === accessor) type = this.getABIType(t);
        });
      } else throw new Error(`${e.getText()}  ${baseExpressionType}`);
    });

    if (offset || !intsOnStack) this.pushLines(`int ${offset} // offset`);
    if (intsOnStack && offset) this.pushVoid('+');

    if (newValue === undefined) {
      this.pushVoid(`int ${getTypeLength(type)}`);
      this.push('extract3', type);
      if (isNumeric(type)) this.push('btoi', type);
    } else {
      this.processNode(newValue);
      if (isNumeric(this.lastType)) this.pushVoid('itob');
      this.pushVoid('replace3');

      this.updateValue(chain[0].expression);
    }
  }

  private processElementAccessExpression(node: ts.ElementAccessExpression) {
    const baseType = this.getStackTypeFromNode(node.expression);
    if (baseType === 'txnGroup') {
      this.processNode(node.expression);
      this.processNode(node.argumentExpression);
      this.lastType = 'grouptxn';
      return;
    }

    if (baseType.startsWith('ImmediateArray')) {
      this.processNode(node.expression);
      this.push(`${this.teal.pop()} ${node.argumentExpression.getText()}`, baseType.replace('ImmediateArray: ', ''));
      return;
    }

    this.processStaticArray(node);
  }

  private processMethodDefinition(node: ts.MethodDeclaration) {
    if (!ts.isIdentifier(node.name)) throw new Error('method name must be identifier');
    this.currentSubroutine.name = node.name.getText();

    const returnType = this.getABIType(node.type!.getText());
    if (returnType === undefined) throw new Error(`A return type annotation must be defined for ${node.name.getText()}`);
    this.currentSubroutine.returnType = returnType;

    this.subroutines[this.currentSubroutine.name] = { returnType, args: node.parameters.length };

    if (!node.body) throw new Error(`A method body must be defined for ${node.name.getText()}`);

    if (node.modifiers && node.modifiers[0].kind === ts.SyntaxKind.PrivateKeyword) {
      this.processSubroutine(node);
      return;
    }

    this.currentSubroutine.decorators = (ts.getDecorators(node) || []).map(
      (d) => d.expression.getText(),
    );

    this.processRoutableMethod(node);
  }

  private processClassDeclaration(node: ts.ClassDeclaration) {
    node.members.forEach((m) => {
      this.processNode(m);
    });
  }

  private processBlockStatement(node: ts.Block) {
    node.statements.forEach((s) => {
      this.processNode(s);
    });
  }

  private processReturnStatement(node: ts.ReturnStatement) {
    this.addSourceComment(node);
    if (node.expression !== undefined) this.processNode(node.expression);

    const { returnType, name } = this.currentSubroutine;

    // Automatically convert to larger int IF the types dont match
    if (returnType !== this.lastType) {
      if (this.lastType?.match(/uint\d+$/)) {
        const returnBitWidth = parseInt(returnType.replace('uint', ''), 10);
        const lastBitWidth = parseInt(this.lastType.replace('uint', ''), 10);
        if (lastBitWidth > returnBitWidth) throw new Error(`Value (${this.lastType}) too large for return type (${returnType})`);

        if (this.lastType === 'uint64') this.pushVoid('itob');

        this.pushVoid(`byte 0x${'FF'.repeat(returnBitWidth / 8)}`);
        this.pushVoid('b&');

        // eslint-disable-next-line no-console
        console.warn(`WARNING: Converting ${name} return value from ${this.lastType} to ${returnType}`);
      } else if ([returnType, this.lastType].includes('string') && [returnType, this.lastType].includes('bytes')) {
        if (returnType === 'string') {
          this.pushLines(
            'dup',
            'len',
            'itob',
            'extract 6 2',
            'swap',
            'concat',
          );
        } else this.pushVoid('extract 2 0');
      } else throw new Error(`Type mismatch (${returnType} !== ${this.lastType})`);
    } else if (isNumeric(returnType)) {
      this.pushVoid('itob');
    } else if (returnType.match(/uint\d+$/)) {
      const returnBitWidth = parseInt(returnType.replace('uint', ''), 10);
      this.pushVoid(`byte 0x${'FF'.repeat(returnBitWidth / 8)}`);
      this.pushVoid('b&');
    }

    this.pushVoid('byte 0x151f7c75');
    this.pushVoid('swap');
    this.pushVoid('concat');
    this.pushVoid('log');
  }

  private getBaseArrayNode(
    node: ts.ElementAccessExpression,
  ): ts.Node {
    if (ts.isElementAccessExpression(node.expression)) {
      return this.getBaseArrayNode(node.expression);
    }
    return node.expression;
  }

  private getArrayNodeChain(
    node: ts.ElementAccessExpression,
    depth: number,
    chain: ts.ElementAccessExpression[] = [],
  ): ts.ElementAccessExpression[] {
    if (chain.length !== depth) {
      if (!ts.isElementAccessExpression(node.expression)) throw new Error(`${depth}`);
      chain.push(node);
      this.getArrayNodeChain(node.expression, depth, chain);
    }
    return chain;
  }

  private fixBitWidth(desiredWidth: number, warn: boolean = true) {
    const lastBitWidth = parseInt(this.lastType.replace('uint', ''), 10);

    // eslint-disable-next-line no-console
    if (lastBitWidth > desiredWidth && warn) console.warn(`WARNING: Converting value from ${this.lastType} to uint${desiredWidth} may result in loss of precision`);

    if (lastBitWidth < desiredWidth) {
      this.pushLines(`byte 0x${'FF'.repeat(desiredWidth / 8)}`, 'b&');
    } else {
      this.pushVoid(`extract ${lastBitWidth / 8 - desiredWidth / 8} 0`);
    }
  }

  private getStackTypeFromNode(node: ts.Node) {
    const preType = this.lastType;
    const preTeal = new Array(...this.teal);
    this.processNode(node);
    const type = this.lastType;
    this.lastType = preType;
    this.teal = preTeal;
    return type;
  }

  private processBinaryExpression(node: ts.BinaryExpression) {
    if (node.operatorToken.getText() === '=') {
      this.addSourceComment(node);

      const leftType = this.getStackTypeFromNode(node.left);
      this.typeHint = leftType;

      if (ts.isIdentifier(node.left)) {
        const name = node.left.getText();
        const target = this.frame[name];
        this.pushVoid(`frame_bury ${target.index} // ${name}: ${target.type}`);
      } else if (ts.isElementAccessExpression(node.left)) {
        this.processStaticArray(node.left, node.right);
      } else if (ts.isPropertyAccessExpression(node.left)) {
        const expressionType = this.getStackTypeFromNode(node.left.expression);

        if (expressionType.startsWith('{') || this.customTypes[expressionType]) {
          const { index } = this.getObjectTypeAndIndex(expressionType, node.left.name.getText());
          const expr = stringToExpression(`${node.left.expression.getText()}[${index}]`);
          if (!ts.isElementAccessExpression(expr)) throw new Error();
          this.processStaticArray(expr, node.right);
          return;
        }
      }

      // TODO: Type check

      this.typeHint = undefined;
      return;
    }

    if (['&&', '||'].includes(node.operatorToken.getText())) {
      this.processLogicalExpression(node);
      return;
    }

    this.processNode(node.left);
    const leftType = this.lastType;
    this.processNode(node.right);

    if (leftType !== this.lastType) throw new Error(`Type mismatch (${leftType} !== ${this.lastType}`);

    const operator = node.operatorToken.getText().replace('===', '==').replace('!==', '!=');
    if (this.lastType === StackType.uint64) {
      this.push(operator, StackType.uint64);
    } else if (this.lastType.match(/uint\d+/) || this.lastType.match(/uifxed\d+x\d+$/)) {
      this.push(`b${operator}`, leftType);
    } else {
      this.push(operator, StackType.uint64);
    }
  }

  private processLogicalExpression(node: ts.BinaryExpression) {
    this.processNode(node.left);

    let label: string;

    if (node.operatorToken.getText() === '&&') {
      label = `skip_and${this.andCount}`;
      this.andCount += 1;

      this.pushVoid('dup');
      this.pushVoid(`bz ${label}`);
    } else if (node.operatorToken.getText() === '||') {
      label = `skip_or${this.orCount}`;
      this.orCount += 1;

      this.pushVoid('dup');
      this.pushVoid(`bnz ${label}`);
    }

    this.processNode(node.right);
    this.push(node.operatorToken.getText(), StackType.uint64);
    this.pushVoid(`${label!}:`);
  }

  private processIdentifier(node: ts.Identifier) {
    // should only be true when calling getStackTypeFromNode
    if (node.getText() === 'globals') {
      this.lastType = 'globals';
      return;
    }

    if (this.contractClasses.includes(node.getText())) {
      this.pushVoid(`PENDING_COMPILE: ${node.getText()}`);
      return;
    }
    const target = this.frame[node.getText()];

    this.push(
      `frame_dig ${target.index} // ${node.getText()}: ${target.type}`,
      target.type,
    );
  }

  private processNewExpression(node: ts.NewExpression) {
    (node.arguments || []).forEach((a) => {
      this.processNode(a);
    });

    this.lastType = this.getABIType(node.expression.getText());
  }

  private processTSAsExpression(node: ts.AsExpression) {
    this.processNode(node.expression);

    const type = this.getABIType(node.type.getText());
    if (type.match(/uint\d+$/) && type !== this.lastType) {
      const typeBitWidth = parseInt(type.replace('uint', ''), 10);

      if (this.lastType === 'uint64') this.pushVoid('itob');
      this.fixBitWidth(typeBitWidth, !ts.isNumericLiteral(node.expression));
    }

    this.lastType = type;
  }

  private processVariableDeclaration(node: ts.VariableDeclarationList) {
    node.declarations.forEach((d) => {
      this.typeHint = d.type?.getText();
      this.processNode(d);
      this.typeHint = undefined;
    });
  }

  private processVariableDeclarator(node: ts.VariableDeclaration) {
    this.addSourceComment(node);
    const name = node.name.getText();

    if (node.initializer) {
      this.processNode(node.initializer);

      this.frame[name] = {
        index: this.frameIndex,
        type: this.lastType,
      };

      this.pushVoid(`frame_bury ${this.frameIndex} // ${name}: ${this.lastType}`);
    } else {
      if (!node.type) throw new Error('Uninitialized variables must have a type');
      this.frame[name] = {
        index: this.frameIndex,
        type: node.type.getText(),
      };
    }

    this.frameIndex -= 1;
  }

  private processExpressionStatement(node: ts.ExpressionStatement) {
    this.processNode(node.expression);
  }

  private processCallExpression(node: ts.CallExpression) {
    this.addSourceComment(node);
    const opcodeNames = langspec.Ops.map((o) => o.Name);
    if (!(ts.isPropertyAccessExpression(node.expression) || ts.isIdentifier(node.expression))) throw new Error(`Only property access expressions are supported (given ${ts.SyntaxKind[node.expression.kind]})`);

    let methodName = '';

    if (ts.isPropertyAccessExpression(node.expression)) {
      methodName = node.expression.name.getText();
    } else if (ts.isIdentifier(node.expression)) {
      methodName = node.expression.getText();
    }

    if (!ts.isPropertyAccessExpression(node.expression)) {
      if (opcodeNames.includes(methodName)) {
        this.processOpcode(node);
      } else if (TXN_METHODS.includes(methodName)) {
        this.processTransaction(node);
      } else if (['addr'].includes(methodName)) {
        // TODO: add pseudo op type parsing/assertion to handle this
        // not currently exported in langspeg.json
        if (!ts.isStringLiteral(node.arguments[0])) throw new Error('addr() argument must be a string literal');
        this.push(`addr ${node.arguments[0].text}`, ForeignType.Account);
      } else if (['method'].includes(methodName)) {
        if (!ts.isStringLiteral(node.arguments[0])) throw new Error('method() argument must be a string literal');
        this.push(`method "${node.arguments[0].text}"`, StackType.bytes);
      } else if (this.customMethods[methodName]) {
        this.customMethods[methodName](node);
      }
    } else if (methodName === 'push') {
      const preType = this.lastType;
      this.processNode(node.expression.expression);
      if (!this.lastType.endsWith('[]')) throw new Error('Cannot only push to dynamic array');
      this.pushLines(
        'dup', // [a, a]
        'int 0',
        'extract_uint16',
        'int 1',
        '+',
        'itob',
        'extract 6 2', // [a, len]
        'swap', // [len, a]
        'extract 2 0', // [len, aElems]
        'concat', // [newA]
      );
      this.processNode(node.arguments[0]);
      if (isNumeric(this.lastType)) this.pushVoid('itob');
      this.pushVoid('concat');

      this.updateValue(node.expression.expression);

      this.lastType = preType;
    } else if (methodName === 'pop') {
      this.processNode(node.expression.expression);
      const poppedType = this.lastType.replace(/\[\]$/, '');
      if (!this.lastType.endsWith('[]')) throw new Error('Can only pop from dynamic array');

      const typeLength = getTypeLength(this.lastType.replace(/\[\]$/, ''));
      this.pushLines(
        'dup', // [a, a]
        'int 0',
        'extract_uint16',
        'int 1',
        '-',
        'itob',
        'extract 6 2', // [a, len]
        'swap', // [len, a]
        'extract 2 0', // [len, aElems]
        'concat', // [newA]
        'dup',
        'len',
        `int ${typeLength}`,
        '-',
        'int 0',
        'swap',
        'extract3',
      );

      // only get the popped element if we're expecting a return value
      if (this.topLevelNode !== node) {
        this.pushLines(
          'dup',
          'len',
          `int ${typeLength}`,
        );

        this.processNode(node.expression.expression);

        this.pushLines(
          'cover 2',
          'extract3',
          'swap',
        );
      }

      this.updateValue(node.expression.expression);

      this.lastType = poppedType;
    } else if (methodName === 'splice') {
      this.processNode(node.expression.expression);
      if (!this.lastType.endsWith('[]')) throw new Error(`Can only splice dynamic array (got ${this.lastType})`);
      const elementType = this.lastType.replace(/\[\]$/, '');

      // get new len
      this.pushLines(
        'int 0',
        'extract_uint16',
      );
      // `int ${parseInt(node.arguments[1].getText(), 10)}`
      this.processNode(node.arguments[1]);
      this.pushLines(
        '-',
        'itob',
        'extract 6 2',
      );

      // TODO: Optimize for literals
      // const spliceIndex = parseInt(node.arguments[0].getText(), 10);
      // const spliceStart = spliceIndex * getTypeLength(elementType);
      this.processNode(node.arguments[0]);
      this.pushLines(
        `int ${getTypeLength(elementType)}`,
        '*',
        'int 2',
        '+',
        `store ${scratch.spliceStart}`,
      );

      // const spliceElementLength = parseInt(node.arguments[1].getText(), 10);
      // const spliceByteLength = (spliceElementLength + 1) * getTypeLength(elementType);
      this.processNode(node.arguments[1]);
      this.pushLines(
        `int ${getTypeLength(elementType)}`,
        '*',
        `int ${getTypeLength(elementType)}`,
        '+',
        `store ${scratch.spliceByteLength}`,
      );

      // extract first part
      this.processNode(node.expression.expression);
      this.pushLines(
        'int 2',
        `load ${scratch.spliceStart}`,
        'substring3',
      );

      // extract second part
      this.processNode(node.expression.expression);
      this.pushLines(
        // get end
        'dup',
        'len',
        // get start (end of splice)
        `load ${scratch.spliceStart}`,
        `load ${scratch.spliceByteLength}`,
        '+',
        `int ${getTypeLength(elementType)}`,
        '-',
        'swap',
        // extract second part
        'substring3',
        // concat everything
        'concat',
        'concat',
      );

      if (this.topLevelNode !== node) {
        // this.pushLines(`byte 0x${spliceElementLength.toString(16).padStart(4, '0')}`);
        this.processNode(node.arguments[1]);
        this.pushLines(
          'itob',
          'extract 6 2',
        );
        this.processNode(node.expression.expression);
        this.pushLines(
          `load ${scratch.spliceStart}`,
          // `int ${spliceByteLength - getTypeLength(elementType)}`,
          `load ${scratch.spliceByteLength}`,
          `int ${getTypeLength(elementType)}`,
          '-',
          'extract3',
          'concat',
          'swap',
        );
      }

      this.updateValue(node.expression.expression);
      this.lastType = `${elementType}[]`;
    } else if (node.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
      const preArgsType = this.lastType;
      this.pushVoid('byte 0x');
      this.pushVoid(`PENDING_DUPN: ${methodName}`);
      new Array(...node.arguments).reverse().forEach((a) => this.processNode(a));
      this.lastType = preArgsType;
      this.push(`callsub ${methodName}`, this.subroutines[methodName].returnType);
    } else if (
      ts.isPropertyAccessExpression(node.expression.expression)
      && Object.keys(this.storageProps).includes(node.expression.expression?.name?.getText())
    ) {
      this.processStorageCall(node);
    } else {
      if (node.expression.expression.kind === ts.SyntaxKind.Identifier) {
        this.processNode(node.expression);
      } else {
        this.processNode(node.expression.expression);
      }
      const preArgsType = this.lastType;
      node.arguments.forEach((a) => this.processNode(a));
      this.lastType = preArgsType;

      this.tealFunction(this.lastType, node.expression.name.getText());
    }
  }

  private processIfStatement(node: ts.IfStatement, elseIfCount: number = 0) {
    let labelPrefix: string;

    if (elseIfCount === 0) {
      labelPrefix = `if${this.ifCount}`;
      this.pushVoid(`// ${labelPrefix}_condition`);
    } else {
      labelPrefix = `if${this.ifCount}_elseif${elseIfCount}`;
      this.pushVoid(`${labelPrefix}_condition:`);
    }

    this.addSourceComment(node.expression);
    this.processNode(node.expression);

    if (node.elseStatement == null) {
      this.pushVoid(`bz if${this.ifCount}_end`);
      this.pushVoid(`// ${labelPrefix}_consequent`);
      this.processNode(node.thenStatement);
    } else if (ts.isIfStatement(node.elseStatement)) {
      this.pushVoid(`bz if${this.ifCount}_elseif${elseIfCount + 1}_condition`);
      this.pushVoid(`// ${labelPrefix}_consequent`);
      this.processNode(node.thenStatement);
      this.pushVoid(`b if${this.ifCount}_end`);
      this.processIfStatement(node.elseStatement, elseIfCount + 1);
    } else if (node.thenStatement.kind === ts.SyntaxKind.Block) {
      this.pushVoid(`bz if${this.ifCount}_else`);
      this.pushVoid(`// ${labelPrefix}_consequent`);
      this.processNode(node.thenStatement);
      this.pushVoid(`b if${this.ifCount}_end`);
      this.pushVoid(`if${this.ifCount}_else:`);
      this.processNode(node.elseStatement);
    } else {
      this.pushVoid(`bz if${this.ifCount}_end`);
      this.processNode(node.elseStatement);
    }

    if (elseIfCount === 0) {
      this.pushVoid(`if${this.ifCount}_end:`);
      this.ifCount += 1;
    }
  }

  private processUnaryExpression(node: ts.PrefixUnaryExpression) {
    this.processNode(node.operand);
    switch (node.operator) {
      case 53:
        this.pushVoid('!');
        break;
      default:
        throw new Error(`Unsupported unary operator ${node.operator}`);
    }
  }

  private processPropertyDefinition(node: ts.PropertyDeclaration) {
    if (node.initializer === undefined || !ts.isNewExpression(node.initializer)) throw new Error();

    const klass = node.initializer.expression.getText();

    if (['BoxMap', 'GlobalMap', 'LocalMap', 'BoxReference', 'GlobalReference', 'LocalReference'].includes(klass)) {
      let props: StorageProp;

      if (klass.includes('Map')) {
        props = {
          type: klass.toLocaleLowerCase().replace('map', ''),
          keyType: this.getABIType(node.initializer.typeArguments![0].getText()),
          valueType: this.getABIType(node.initializer.typeArguments![1].getText()),
        };
      } else {
        props = {
          type: klass.toLocaleLowerCase().replace('map', '').replace('reference', ''),
          keyType: 'bytes',
          valueType: this.getABIType(node.initializer.typeArguments![0].getText()),
        };
      }

      if (props.type === 'box' && this.isDynamicType(props.valueType)) {
        props.dynamicSize = true;
      }

      if (node.initializer?.arguments?.[0] !== undefined) {
        if (!ts.isObjectLiteralExpression(node.initializer.arguments[0])) throw new Error('Expected object literal');

        node.initializer.arguments[0].properties.forEach((p) => {
          if (!ts.isPropertyAssignment(p)) throw new Error();
          const name = p.name?.getText();

          switch (name) {
            case 'key':
              if (klass.includes('Map')) throw new Error(`${name} only applies to storage references`);
              if (!ts.isStringLiteral(p.initializer)) throw new Error('Storage key must be string');
              props.key = p.initializer.text;
              break;
            case 'defaultSize':
              if (props.type !== 'box') throw new Error(`${name} only applies to box storage`);
              props.defaultSize = parseInt(p.initializer.getText(), 10);
              break;
            case 'dynamicSize':
              if (props.type !== 'box') throw new Error(`${name} only applies to box storage`);
              if (!this.isDynamicType(props.valueType)) throw new Error(`${name} only applies to dynamic types`);

              props.dynamicSize = p.initializer.getText() === 'true';
              break;
            default:
              throw new Error(`Unknown property ${name}`);
          }
        });
      }

      if (!props.key && klass.includes('Reference')) {
        props.key = node.name.getText();
      }

      this.storageProps[node.name.getText()] = props;
    } else {
      throw new Error();
    }
  }

  private processLiteral(node: ts.StringLiteral | ts.NumericLiteral) {
    if (node.kind === ts.SyntaxKind.StringLiteral) {
      this.push(`byte "${node.text}"`, StackType.bytes);
    } else {
      this.push(`int ${node.getText()}`, StackType.uint64);
    }
  }

  private processMemberExpression(node: ts.PropertyAccessExpression) {
    const chain = this.getChain(node).reverse();

    chain.push(node);

    chain.forEach((n) => {
      if (n.kind === ts.SyntaxKind.CallExpression) {
        this.processNode(n);
        return;
      }

      const expressionType = this.getStackTypeFromNode(n.expression);
      if (expressionType.startsWith('{') || this.customTypes[expressionType]) {
        const { index } = this.getObjectTypeAndIndex(expressionType, n.name.getText());
        this.processNode(stringToExpression(`${n.expression.getText()}[${index}]`));
        return;
      }

      if (n.expression.getText() === 'globals') {
        this.tealFunction('global', n.name.getText());
        return;
      }

      if (this.frame[n.expression.getText()]) {
        this.processStorageExpression(n);
        return;
      }

      if (n.expression.kind === ts.SyntaxKind.ThisKeyword) {
        switch (n.name.getText()) {
          case 'app':
            this.lastType = 'application';
            this.pushVoid('txna Applications 0');
            break;
          default:
            this.lastType = n.name.getText();
            break;
        }

        return;
      }

      if (n.name.kind !== ts.SyntaxKind.Identifier) {
        const prevType = this.lastType;
        this.processNode(n.name);
        this.lastType = prevType;
        return;
      }

      this.tealFunction(this.lastType, n.name.getText());
    });
  }

  private processSubroutine(fn: ts.MethodDeclaration) {
    this.pushVoid(`${this.currentSubroutine.name}:`);
    const lastFrame = JSON.parse(JSON.stringify(this.frame));
    this.frame = {};

    this.pushVoid(`PENDING_PROTO: ${this.currentSubroutine.name}`);

    this.frameIndex = -1;
    const params = new Array(...fn.parameters);
    params.forEach((p) => {
      if (p.type === undefined) throw new Error();

      let type = this.getABIType(p.type.getText());

      if (type.startsWith('Static')) {
        type = this.getABIType(type);
      }

      this.frame[p.name.getText()] = { index: this.frameIndex, type: type.replace('string', 'bytes') };
      this.frameIndex -= 1;
    });

    this.processNode(fn.body!);

    this.pushVoid('retsub');
    this.frame = lastFrame;
    this.frameSize[this.currentSubroutine.name] = this.frameIndex * -1;
  }

  private processClearState(fn: ts.MethodDeclaration) {
    if (this.clearStateCompiled) throw Error('duplicate clear state decorator defined');

    this.compilingApproval = false;
    this.processNode(fn.body!);
    this.clearStateCompiled = true;
    this.compilingApproval = true;
  }

  private processBareMethod(fn: ts.MethodDeclaration) {
    let allowCreate: boolean = false;
    let isClearState: boolean = false;
    const allowedOnCompletes: string[] = [];

    this.currentSubroutine.decorators?.forEach((d, i) => {
      switch (d) {
        case 'createApplication':
          allowCreate = true;
          break;
        case 'noOp':
          allowedOnCompletes.push('NoOp');
          break;
        case 'optIn':
          allowedOnCompletes.push('OptIn');
          break;
        case 'closeOut':
          allowedOnCompletes.push('CloseOut');
          break;
        case 'updateApplication':
          allowedOnCompletes.push('UpdateApplication');
          break;
        case 'deleteApplication':
          allowedOnCompletes.push('DeleteApplication');
          break;
        case 'clearState':
          isClearState = true;
          break;
        default:
          throw new Error(`Unknown decorator: ${d}`);
      }
    });

    if (isClearState) {
      this.processClearState(fn);
      return;
    }

    this.pushVoid(`bare_route_${this.currentSubroutine.name}:`);
    this.pushVoid('byte 0x');
    this.pushVoid(`PENDING_DUPN: ${this.currentSubroutine.name}`);
    this.pushVoid(`callsub ${this.currentSubroutine.name}`);
    this.pushVoid('int 1');
    this.pushVoid('return');

    const predicates: string[] = [];
    allowedOnCompletes.forEach((oc, i) => {
      predicates.push(`int ${oc}`);
      predicates.push('txn OnCompletion');
      predicates.push('==');
      if (i > 0) predicates.push('||');
    });

    // if not a create, dont allow it
    predicates.push('txn ApplicationID');
    predicates.push('int 0');
    predicates.push(allowCreate ? '==' : '!=');
    if (allowedOnCompletes.length > 0) predicates.push('&&');

    this.bareMethods.push({
      name: this.currentSubroutine.name,
      predicates,
    });
    this.processSubroutine(fn);
  }

  private processRoutableMethod(fn: ts.MethodDeclaration) {
    const argCount = fn.parameters.length;

    const bareDecorators = this.currentSubroutine.decorators?.length || 0;

    // bare method
    if (argCount === 0 && bareDecorators > 0) {
      this.processBareMethod(fn);
      return;
    }

    this.pushVoid(`abi_route_${this.currentSubroutine.name}:`);
    const args: {name: string, type: string, desc: string}[] = [];

    this.pushVoid('txn OnCompletion');
    this.pushVoid('int NoOp');
    this.pushVoid('==');
    this.pushVoid('assert');

    this.pushVoid('byte 0x');
    this.pushVoid(`PENDING_DUPN: ${this.currentSubroutine.name}`);

    let nonTxnArgCount = argCount - fn.parameters.filter((p) => p.type?.getText().includes('Txn')).length + 1;
    let gtxnIndex = 0;

    new Array(...fn.parameters).reverse().forEach((p) => {
      const type = this.getABIType(p!.type!.getText());
      let abiType = type;

      if (type.includes('txn')) {
        switch (type) {
          case 'paytxn':
            abiType = TransactionType.PaymentTx;
            break;
          case 'assettransfertxn':
            abiType = TransactionType.AssetTransferTx;
            break;
          default:
            break;
        }
      } else {
        this.pushVoid(`txna ApplicationArgs ${nonTxnArgCount -= 1}`);
      }

      if (type === StackType.uint64) {
        this.pushVoid('btoi');
      } else if (isRefType(type)) {
        this.pushVoid('btoi');
        this.pushVoid(`txnas ${capitalizeFirstChar(type)}s`);
      } else if (type.includes('txn')) {
        this.pushVoid('txn GroupIndex');
        this.pushVoid(`int ${(gtxnIndex += 1)}`);
        this.pushVoid('-');
      } else if (type === 'string') {
        this.pushVoid('extract 2 0');
      }

      args.push({ name: p.name.getText(), type: this.getABIType(abiType), desc: '' });
    });

    const returnType = this.currentSubroutine.returnType
      .replace(/asset|application/, 'uint64')
      .replace('account', 'address');

    this.abi.methods.push({
      name: this.currentSubroutine.name,
      args: args.reverse(),
      desc: '',
      returns: { type: returnType, desc: '' },
    });

    this.pushVoid(`callsub ${this.currentSubroutine.name}`);
    this.pushVoid('int 1');
    this.pushVoid('return');
    this.processSubroutine(fn);
  }

  private processOpcode(node: ts.CallExpression) {
    const opSpec = langspec.Ops.find(
      (o) => o.Name === node.expression.getText(),
    ) as OpSpec;
    let line: string[] = [node.expression.getText()];

    if (opSpec.Size === 1) {
      const preArgsType = this.lastType;
      node.arguments.forEach((a) => this.processNode(a));
      this.lastType = preArgsType;
    } else if (opSpec.Size === 0) {
      line = line.concat(node.arguments.map((a) => a.getText()));
    } else {
      line = line.concat(
        node.arguments.slice(0, opSpec.Size - 1).map((a) => a.getText()),
      );
    }

    this.pushVoid(line.join(' '));
  }

  private processStorageCall(node: ts.CallExpression) {
    if (!ts.isPropertyAccessExpression(node.expression)) throw new Error();
    if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error();

    const op = node.expression.name.getText();
    const { type } = this.storageProps[node.expression.expression.name.getText()];

    this.storageFunctions[type][op](node);
  }

  private processTransaction(node: ts.CallExpression) {
    let txnType = '';

    switch (node.expression.getText()) {
      case 'sendPayment':
        txnType = TransactionType.PaymentTx;
        break;
      case 'sendAssetTransfer':
        txnType = TransactionType.AssetTransferTx;
        break;
      case 'sendMethodCall':
      case 'sendAppCall':
        txnType = TransactionType.ApplicationCallTx;
        break;
      case 'sendAssetCreation':
      case 'sendAssetConfig':
        txnType = TransactionType.AssetConfigTx;
        break;
      default:
        throw new Error(`Invalid transaction call ${node.expression.getText()}`);
    }

    this.pushVoid('itxn_begin');
    this.pushVoid(`int ${txnType}`);
    this.pushVoid('itxn_field TypeEnum');

    if (!ts.isObjectLiteralExpression(node.arguments[0])) throw new Error('Transaction call argument must be an object');

    const nameProp = node.arguments[0].properties.find(
      (p) => p.name?.getText() === 'name',

    );

    if (nameProp) {
      if (!ts.isPropertyAssignment(nameProp) || !ts.isStringLiteral(nameProp.initializer)) throw new Error('Method call name key must be a string');

      if (node.typeArguments === undefined || !ts.isTupleTypeNode(node.typeArguments[0])) throw new Error('Transaction call type arguments[0] must be a tuple type');

      const argTypes = node.typeArguments[0].elements.map(
        (t) => getABITupleString(this.getABIType(t.getText())),
      );

      let returnType = node.typeArguments![1].getText();

      returnType = returnType.toLowerCase()
        .replace('asset', 'uint64')
        .replace('account', 'address')
        .replace('application', 'uint64');

      this.pushVoid(
        `method "${nameProp.initializer.text}(${argTypes.join(',')})${returnType}"`,
      );
      this.pushVoid('itxn_field ApplicationArgs');
    }

    node.arguments[0].properties.forEach((p) => {
      const key = p.name?.getText();

      if (key === undefined) throw new Error('Key must be defined');

      if (key === 'name') {
        return;
      }

      this.addSourceComment(p, true);
      this.pushComments(p);

      if (key === 'OnCompletion') {
        if (!ts.isPropertyAssignment(p) || !ts.isStringLiteral(p.initializer)) throw new Error('OnCompletion key must be a string');
        this.pushVoid(`int ${p.initializer.text}`);
        this.pushVoid('itxn_field OnCompletion');
      } else if (key === 'methodArgs') {
        if (node.typeArguments === undefined || !ts.isTupleTypeNode(node.typeArguments[0])) throw new Error('Transaction call type arguments[0] must be a tuple type');
        const argTypes = node.typeArguments[0].elements.map(
          (t) => this.getABIType(t.getText()),
        );

        let accountIndex = 1;
        let appIndex = 1;
        let assetIndex = 0;

        if (!ts.isPropertyAssignment(p) || !ts.isArrayLiteralExpression(p.initializer)) throw new Error('methodArgs must be an array');

        p.initializer.elements.forEach((e, i: number) => {
          if (argTypes[i] === ForeignType.Account) {
            this.processNode(e);
            this.pushVoid('itxn_field Accounts');
            this.pushVoid(`int ${accountIndex}`);
            this.pushVoid('itob');
            accountIndex += 1;
          } else if (argTypes[i] === ForeignType.Asset) {
            this.processNode(e);
            this.pushVoid('itxn_field Assets');
            this.pushVoid(`int ${assetIndex}`);
            this.pushVoid('itob');
            assetIndex += 1;
          } else if (argTypes[i] === ForeignType.Application) {
            this.processNode(e);
            this.pushVoid('itxn_field Applications');
            this.pushVoid(`int ${appIndex}`);
            this.pushVoid('itob');
            appIndex += 1;
          } else if (argTypes[i] === StackType.uint64) {
            this.processNode(e);
            this.pushVoid('itob');
          } else {
            this.processNode(e);
          }
          this.pushVoid('itxn_field ApplicationArgs');
        });
      } else if (ts.isPropertyAssignment(p) && ts.isArrayLiteralExpression(p.initializer)) {
        p.initializer.elements.forEach((e) => {
          this.processNode(e);
          this.pushVoid(`itxn_field ${capitalizeFirstChar(key)}`);
        });
      } else if (ts.isPropertyAssignment(p)) {
        this.processNode(p.initializer);
        this.pushVoid(`itxn_field ${capitalizeFirstChar(key)}`);
      } else {
        throw new Error(`Cannot process transaction property: ${p.getText()}`);
      }
    });

    this.pushVoid('itxn_submit');

    if (node.expression.getText() === 'sendMethodCall' && node.typeArguments![1].getText() !== 'void') {
      this.pushLines(
        'itxn NumLogs',
        'int 1',
        '-',
        'itxnas Logs',
        'extract 4 0',
      );

      const returnType = this.getABIType(node.typeArguments![1].getText());
      if (isNumeric(returnType)) this.pushVoid('btoi');
      this.lastType = returnType;
    } else if (node.expression.getText() === 'sendAssetCreation') {
      this.push('itxn CreatedAssetID', 'asset');
    }
  }

  private processStorageExpression(node: ts.PropertyAccessExpression) {
    const name = node.expression.getText();
    const target = this.frame[name];

    this.push(
      `frame_dig ${target.index} // ${name}: ${target.type}`,
      target.type,
    );

    this.tealFunction(target.type, node.name.getText(), true);
  }

  private getChain(
    node: ts.PropertyAccessExpression,
    chain: (ts.PropertyAccessExpression | ts.CallExpression)[] = [],
  ): (ts.PropertyAccessExpression | ts.CallExpression)[] {
    if (ts.isPropertyAccessExpression(node.expression)) {
      chain.push(node.expression);
      return this.getChain(node.expression, chain);
    }
    if (ts.isCallExpression(node.expression)) {
      chain.push(node.expression);
      if (!ts.isPropertyAccessExpression(node.expression.expression)) throw new Error('Invalid call chain');
      return this.getChain(
        node.expression.expression,
        chain,
      );
    }
    return chain;
  }

  private tealFunction(calleeType: string, name: string, checkArgs: boolean = false): void {
    let type = calleeType;
    if (type.includes('txn') && !['itxn', 'txn'].includes(type)) {
      type = 'gtxns';
    }

    if (!name.startsWith('has')) {
      const paramObj = this.OP_PARAMS[type].find((p) => {
        let paramName = p.name.replace(/^Acct/, '');

        if (type === ForeignType.Application) paramName = paramName.replace(/^App/, '');
        if (type === ForeignType.Asset) paramName = paramName.replace(/^Asset/, '');
        return paramName === capitalizeFirstChar(name);
      });

      if (!paramObj) throw new Error(`Unknown method: ${type}.${name}`);

      if (!checkArgs || paramObj.args === 1) {
        paramObj.fn();
      }
      return;
    }

    switch (name) {
      case 'hasBalance':
        this.hasMaybeValue('acct_params_get AcctBalance');
        return;
      case 'hasAsset':
        if (!checkArgs) {
          this.hasMaybeValue('asset_holding_get AssetBalance');
        }
        return;
      default:
        throw new Error(`Unknown method: ${type}.${name}`);
    }
  }

  async algodCompile(): Promise<string> {
    const response = await fetch(
      'https://mainnet-api.algonode.cloud/v2/teal/compile?sourcemap=true',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: this.approvalProgram(),
      },
    );

    const json = await response.json();

    if (response.status !== 200) {
      // console.log(this.approvalProgram().split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n'));

      throw new Error(`${response.statusText}: ${json.message}`);
    }

    const pcList = json.sourcemap.mappings.split(';').map((m: string) => {
      const decoded = vlq.decode(m);
      if (decoded.length > 2) return decoded[2];
      return undefined;
    });

    let lastLine = 0;

    // eslint-disable-next-line no-restricted-syntax
    for (const [pc, lineDelta] of pcList.entries()) {
      // If the delta is not undefined, the lastLine should be updated with
      // lastLine + the delta
      if (lineDelta !== undefined) {
        lastLine += lineDelta;
      }

      if (!(lastLine in this.lineToPc)) this.lineToPc[lastLine] = [];

      this.lineToPc[lastLine].push(pc);
      this.pcToLine[pc] = lastLine;
    }

    return json.result;
  }

  private addSourceComment(node: ts.Node, force: boolean = false) {
    if (
      !force
      && node.getStart() >= this.lastSourceCommentRange[0]
      && node.getEnd() <= this.lastSourceCommentRange[1]
    ) { return; }

    const lineNum = ts.getLineAndCharacterOfPosition(this.sourceFile, node.getStart()).line + 1;

    if (this.filename) { this.pushVoid(`// ${this.filename}:${lineNum}`); }
    this.pushVoid(`// ${node.getText().replace(/\n/g, '\n//').split('\n')[0]}`);

    this.lastSourceCommentRange = [node.getStart(), node.getEnd()];
  }

  appSpec(): object {
    const approval = Buffer.from(this.approvalProgram()).toString('base64');
    const clear = Buffer.from(this.clearProgram()).toString('base64');

    const globalDeclared: Record<string, object> = {};
    const localDeclared: Record<string, object> = {};

    const state = {
      global: {
        num_byte_slices: 0,
        num_uints: 0,
      },
      local: {
        num_byte_slices: 0,
        num_uints: 0,
      },
    };
    // eslint-disable-next-line no-restricted-syntax
    for (const [k, v] of Object.entries(this.storageProps)) {
      // eslint-disable-next-line default-case
      // TODO; Proper global/local types?
      switch (v.type) {
        case 'global':
          if (isNumeric(v.valueType)) {
            state.global.num_uints += 1;
            globalDeclared[k] = { type: 'uint64', key: k };
          } else {
            globalDeclared[k] = { type: 'bytes', key: k };
            state.global.num_byte_slices += 1;
          }

          break;
        case 'local':
          if (isNumeric(v.valueType)) {
            state.local.num_uints += 1;
            localDeclared[k] = { type: 'uint64', key: k };
          } else {
            state.local.num_byte_slices += 1;
            localDeclared[k] = { type: 'bytes', key: k };
          }
          break;
        default:
          // TODO: boxes?
          break;
      }
    }

    return {
      hints: {},
      schema: {
        local: { declared: localDeclared, reserved: {} },
        global: { declared: globalDeclared, reserved: {} },
      },
      state,
      source: { approval, clear },
      contract: this.abi,
    };
  }

  approvalProgram(): string {
    if (this.generatedTeal !== '') return this.generatedTeal;

    const output = this.prettyTeal(this.teal);
    this.generatedTeal = output.join('\n');

    return this.generatedTeal;
  }

  clearProgram(): string {
    if (this.generatedClearTeal !== '') return this.generatedClearTeal;

    const output = this.prettyTeal(this.clearTeal);
    // if no clear state, just default approve
    if (!this.clearStateCompiled) {
      output.push('int 1');
      output.push('return');
    }
    this.generatedClearTeal = output.join('\n');

    return this.generatedClearTeal;
  }

  // eslint-disable-next-line class-methods-use-this
  prettyTeal(teal: string[]): string[] {
    const output: string[] = [];
    let comments: string[] = [];

    let lastIsLabel: boolean = false;

    teal.forEach((t) => {
      if (t.startsWith('//')) {
        comments.push(t);
        return;
      }

      const isLabel = t.split('//')[0].endsWith(':');

      if ((!lastIsLabel && comments.length !== 0) || isLabel) output.push('');

      if (isLabel || t.startsWith('#')) {
        comments.forEach((c) => output.push(c));
        comments = [];
        output.push(t);
        lastIsLabel = true;
      } else {
        comments.forEach((c) => output.push(`\t${c.replace(/\n/g, '\n\t')}`));
        comments = [];
        output.push(`\t${t}`);
        lastIsLabel = false;
      }
    });

    return output;
  }
}
