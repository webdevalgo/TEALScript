/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */

import { Contract } from '../../src/lib/index';

// eslint-disable-next-line no-unused-vars
class AbiTest extends Contract {
  @createApplication
  create(): void {}

  staticArray(): uint64 {
    const c: Static<uint64[], 3> = [11, 22, 33];

    return c[1];
  }

  returnStaticArray(): Static<uint64[], 3> {
    const c: Static<uint64[], 3> = [11, 22, 33];

    return c;
  }
}
