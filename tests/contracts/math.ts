/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */

import { Contract } from '../../src/lib/index';

// eslint-disable-next-line no-unused-vars
class MathTest extends Contract {
  u64plus(a: uint64, b: uint64): uint64 {
    return a + b;
  }

  u64minus(a: uint64, b: uint64): uint64 {
    return a - b;
  }

  u64mul(a: uint64, b: uint64): uint64 {
    return a * b;
  }

  u64div(a: uint64, b: uint64): uint64 {
    return a / b;
  }

  u256plus(a: uint256, b: uint256): uint256 {
    return a + b;
  }

  u256minus(a: uint256, b: uint256): uint256 {
    return a - b;
  }

  u256mul(a: uint256, b: uint256): uint256 {
    return a * b;
  }

  u256div(a: uint256, b: uint256): uint256 {
    return a / b;
  }

  u64Return256(a: uint64, b: uint64): uint256 {
    return a + b;
  }

  maxU64(): void {
    // eslint-disable-next-line no-loss-of-precision
    assert(18_446_744_073_709_551_615);
  }
}