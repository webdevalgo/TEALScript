/* eslint-disable */
/**
 * This file was automatically generated by @algorandfoundation/algokit-client-generator.
 * DO NOT MODIFY IT BY HAND.
 * requires: @algorandfoundation/algokit-utils: ^2
 */
import * as algokit from '@algorandfoundation/algokit-utils'
import type {
  AppCallTransactionResult,
  AppCallTransactionResultOfType,
  CoreAppCallArgs,
  RawAppCallArgs,
  AppState,
  TealTemplateParams,
  ABIAppCallArg,
} from '@algorandfoundation/algokit-utils/types/app'
import type {
  AppClientCallCoreParams,
  AppClientCompilationParams,
  AppClientDeployCoreParams,
  AppDetails,
  ApplicationClient,
} from '@algorandfoundation/algokit-utils/types/app-client'
import type { AppSpec } from '@algorandfoundation/algokit-utils/types/app-spec'
import type { SendTransactionResult, TransactionToSign, SendTransactionFrom } from '@algorandfoundation/algokit-utils/types/transaction'
import type { TransactionWithSigner } from 'algosdk'
import { Algodv2, OnApplicationComplete, Transaction, AtomicTransactionComposer } from 'algosdk'
export const APP_SPEC: AppSpec = {
  "hints": {
    "deleteApplication()void": {
      "call_config": {
        "delete_application": "CALL"
      }
    },
    "createApplication()void": {
      "call_config": {
        "no_op": "CREATE"
      }
    },
    "verify(byte[],byte[33][3])void": {
      "call_config": {
        "no_op": "CALL"
      }
    },
    "appendLeaf(byte[],byte[33][3])void": {
      "call_config": {
        "no_op": "CALL"
      }
    },
    "updateLeaf(byte[],byte[],byte[33][3])void": {
      "call_config": {
        "no_op": "CALL"
      }
    }
  },
  "bare_call_config": {
    "no_op": "NEVER",
    "opt_in": "NEVER",
    "close_out": "NEVER",
    "update_application": "NEVER",
    "delete_application": "NEVER"
  },
  "schema": {
    "local": {
      "declared": {},
      "reserved": {}
    },
    "global": {
      "declared": {
        "root": {
          "type": "bytes",
          "key": "root"
        },
        "size": {
          "type": "uint64",
          "key": "size"
        }
      },
      "reserved": {}
    }
  },
  "state": {
    "global": {
      "num_byte_slices": 1,
      "num_uints": 1
    },
    "local": {
      "num_byte_slices": 0,
      "num_uints": 0
    }
  },
  "source": {
    "approval": "I3ByYWdtYSB2ZXJzaW9uIDkKCi8vIFRoaXMgVEVBTCB3YXMgZ2VuZXJhdGVkIGJ5IFRFQUxTY3JpcHQgdjAuNjcuMwovLyBodHRwczovL2dpdGh1Yi5jb20vYWxnb3JhbmRmb3VuZGF0aW9uL1RFQUxTY3JpcHQKCi8vIFRoaXMgY29udHJhY3QgaXMgY29tcGxpYW50IHdpdGggYW5kL29yIGltcGxlbWVudHMgdGhlIGZvbGxvd2luZyBBUkNzOiBbIEFSQzQgXQoKLy8gVGhlIGZvbGxvd2luZyB0ZW4gbGluZXMgb2YgVEVBTCBoYW5kbGUgaW5pdGlhbCBwcm9ncmFtIGZsb3cKLy8gVGhpcyBwYXR0ZXJuIGlzIHVzZWQgdG8gbWFrZSBpdCBlYXN5IGZvciBhbnlvbmUgdG8gcGFyc2UgdGhlIHN0YXJ0IG9mIHRoZSBwcm9ncmFtIGFuZCBkZXRlcm1pbmUgaWYgYSBzcGVjaWZpYyBhY3Rpb24gaXMgYWxsb3dlZAovLyBIZXJlLCBhY3Rpb24gcmVmZXJzIHRvIHRoZSBPbkNvbXBsZXRlIGluIGNvbWJpbmF0aW9uIHdpdGggd2hldGhlciB0aGUgYXBwIGlzIGJlaW5nIGNyZWF0ZWQgb3IgY2FsbGVkCi8vIEV2ZXJ5IHBvc3NpYmxlIGFjdGlvbiBmb3IgdGhpcyBjb250cmFjdCBpcyByZXByZXNlbnRlZCBpbiB0aGUgc3dpdGNoIHN0YXRlbWVudAovLyBJZiB0aGUgYWN0aW9uIGlzIG5vdCBpbXBsbWVudGVkIGluIHRoZSBjb250cmFjdCwgaXRzIHJlc3BlY3RpdmUgYnJhbmNoIHdpbGwgYmUgIk5PVF9JTVBMRU1FTlRFRCIgd2hpY2gganVzdCBjb250YWlucyAiZXJyIgp0eG4gQXBwbGljYXRpb25JRAppbnQgMAo+CmludCA2CioKdHhuIE9uQ29tcGxldGlvbgorCnN3aXRjaCBjcmVhdGVfTm9PcCBOT1RfSU1QTEVNRU5URUQgTk9UX0lNUExFTUVOVEVEIE5PVF9JTVBMRU1FTlRFRCBOT1RfSU1QTEVNRU5URUQgTk9UX0lNUExFTUVOVEVEIGNhbGxfTm9PcCBOT1RfSU1QTEVNRU5URUQgTk9UX0lNUExFTUVOVEVEIE5PVF9JTVBMRU1FTlRFRCBOT1RfSU1QTEVNRU5URUQgY2FsbF9EZWxldGVBcHBsaWNhdGlvbgoKTk9UX0lNUExFTUVOVEVEOgoJZXJyCgovLyBjYWxjSW5pdFJvb3QoKWJ5dGVbMzJdCmNhbGNJbml0Um9vdDoKCXByb3RvIDAgMQoKCS8vIFB1c2ggZW1wdHkgYnl0ZXMgYWZ0ZXIgdGhlIGZyYW1lIHBvaW50ZXIgdG8gcmVzZXJ2ZSBzcGFjZSBmb3IgbG9jYWwgdmFyaWFibGVzCglieXRlIDB4CglkdXAKCgkvLyBleGFtcGxlcy9tZXJrbGUvbWVya2xlLmFsZ28udHM6MTkKCS8vIHJlc3VsdCA9IEVNUFRZX0hBU0gKCS8vIGV4YW1wbGVzL21lcmtsZS9tZXJrbGUuYWxnby50czo2CgkvLyBoZXgoJ2UzYjBjNDQyOThmYzFjMTQ5YWZiZjRjODk5NmZiOTI0MjdhZTQxZTQ2NDliOTM0Y2E0OTU5OTFiNzg1MmI4NTUnKQoJYnl0ZSAweGUzYjBjNDQyOThmYzFjMTQ5YWZiZjRjODk5NmZiOTI0MjdhZTQxZTQ2NDliOTM0Y2E0OTU5OTFiNzg1MmI4NTUwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwCglieXRlIDB4CglkdXAKCWI9PQoJYXNzZXJ0CglleHRyYWN0IDAgMzIKCWZyYW1lX2J1cnkgMCAvLyByZXN1bHQ6IGJ5dGVbMzJdCgoJLy8gZXhhbXBsZXMvbWVya2xlL21lcmtsZS5hbGdvLnRzOjIxCgkvLyBpID0gMAoJaW50IDAKCWZyYW1lX2J1cnkgMSAvLyBpOiB1aW50NjQKCmZvcl8wOgoJLy8gZXhhbXBsZXMvbWVya2xlL21lcmtsZS5hbGdvLnRzOjIxCgkvLyBpIDwgVFJFRV9ERVBUSAoJZnJhbWVfZGlnIDEgLy8gaTogdWludDY0CglpbnQgMwoJPAoJYnogZm9yXzBfZW5kCgoJLy8gZXhhbXBsZXMvbWVya2xlL21lcmtsZS5hbGdvLnRzOjIyCgkvLyByZXN1bHQgPSBzaGEyNTYocmVzdWx0ICsgcmVzdWx0KQoJZnJhbWVfZGlnIDAgLy8gcmVzdWx0OiBieXRlWzMyXQoJZnJhbWVfZGlnIDAgLy8gcmVzdWx0OiBieXRlWzMyXQoJY29uY2F0CglzaGEyNTYKCWZyYW1lX2J1cnkgMCAvLyByZXN1bHQ6IGJ5dGVbMzJdCgoJLy8gZXhhbXBsZXMvbWVya2xlL21lcmtsZS5hbGdvLnRzOjIxCgkvLyBpID0gaSArIDEKCWZyYW1lX2RpZyAxIC8vIGk6IHVpbnQ2NAoJaW50IDEKCSsKCWZyYW1lX2J1cnkgMSAvLyBpOiB1aW50NjQKCWIgZm9yXzAKCmZvcl8wX2VuZDoKCS8vIGV4YW1wbGVzL21lcmtsZS9tZXJrbGUuYWxnby50czoyNQoJLy8gcmV0dXJuIHJlc3VsdDsKCWZyYW1lX2RpZyAwIC8vIHJlc3VsdDogYnl0ZVszMl0KCgkvLyBzZXQgdGhlIHN1YnJvdXRpbmUgcmV0dXJuIHZhbHVlCglmcmFtZV9idXJ5IDAKCgkvLyBwb3AgYWxsIGxvY2FsIHZhcmlhYmxlcyBmcm9tIHRoZSBzdGFjawoJcG9wbiAxCglyZXRzdWIKCi8vIGhhc2hDb25jYXQoYnl0ZVszMl0sYnl0ZVszMl0pYnl0ZVszMl0KaGFzaENvbmNhdDoKCXByb3RvIDIgMQoKCS8vIGV4YW1wbGVzL21lcmtsZS9tZXJrbGUuYWxnby50czoyOQoJLy8gcmV0dXJuIHNoYTI1NihsZWZ0ICsgcmlnaHQpOwoJZnJhbWVfZGlnIC0xIC8vIGxlZnQ6IGJ5dGUzMgoJZnJhbWVfZGlnIC0yIC8vIHJpZ2h0OiBieXRlMzIKCWNvbmNhdAoJc2hhMjU2CglyZXRzdWIKCi8vIGlzUmlnaHRTaWJsaW5nKGJ5dGVbMzNdKWJvb2wKaXNSaWdodFNpYmxpbmc6Cglwcm90byAxIDEKCgkvLyBleGFtcGxlcy9tZXJrbGUvbWVya2xlLmFsZ28udHM6MzMKCS8vIHJldHVybiBnZXRieXRlKGVsZW0sIDApID09PSBSSUdIVF9TSUJMSU5HX1BSRUZJWDsKCWZyYW1lX2RpZyAtMSAvLyBlbGVtOiBCcmFuY2gKCWludCAwCglnZXRieXRlCglpbnQgMTcwCgk9PQoJcmV0c3ViCgovLyBjYWxjUm9vdChieXRlWzMzXVszXSxieXRlWzMyXSlieXRlWzMyXQpjYWxjUm9vdDoKCXByb3RvIDIgMQoKCS8vIFB1c2ggZW1wdHkgYnl0ZXMgYWZ0ZXIgdGhlIGZyYW1lIHBvaW50ZXIgdG8gcmVzZXJ2ZSBzcGFjZSBmb3IgbG9jYWwgdmFyaWFibGVzCglieXRlIDB4CglkdXAKCgkvLyBleGFtcGxlcy9tZXJrbGUvbWVya2xlLmFsZ28udHM6MzkKCS8vIGkgPSAwCglpbnQgMAoJZnJhbWVfYnVyeSAwIC8vIGk6IHVpbnQ2NAoKZm9yXzE6CgkvLyBleGFtcGxlcy9tZXJrbGUvbWVya2xlLmFsZ28udHM6MzkKCS8vIGkgPCBUUkVFX0RFUFRICglmcmFtZV9kaWcgMCAvLyBpOiB1aW50NjQKCWludCAzCgk8CglieiBmb3JfMV9lbmQKCWZyYW1lX2RpZyAwIC8vIGk6IHVpbnQ2NAoJZnJhbWVfYnVyeSAxIC8vIGFjY2Vzc29yOiBhY2Nlc3Nvci8vMC8vZWxlbQoKCS8vIGlmMF9jb25kaXRpb24KCS8vIGV4YW1wbGVzL21lcmtsZS9tZXJrbGUuYWxnby50czo0MgoJLy8gdGhpcy5pc1JpZ2h0U2libGluZyhlbGVtKQoJZnJhbWVfZGlnIC0yIC8vIHBhdGg6IFBhdGgKCXN0b3JlIDI1NSAvLyBmdWxsIGFycmF5CglpbnQgMCAvLyBpbml0aWFsIG9mZnNldAoJZnJhbWVfZGlnIDEgLy8gc2F2ZWQgYWNjZXNzb3I6IGFjY2Vzc29yLy8wLy9lbGVtCglpbnQgMzMKCSogLy8gYWNjICogdHlwZUxlbmd0aAoJKwoJbG9hZCAyNTUgLy8gZnVsbCBhcnJheQoJc3dhcAoJaW50IDMzCglleHRyYWN0MwoJY2FsbHN1YiBpc1JpZ2h0U2libGluZwoJYnogaWYwX2Vsc2UKCgkvLyBpZjBfY29uc2VxdWVudAoJLy8gZXhhbXBsZXMvbWVya2xlL21lcmtsZS5hbGdvLnRzOjQzCgkvLyByZXN1bHQgPSB0aGlzLmhhc2hDb25jYXQocmVzdWx0LCBleHRyYWN0MyhlbGVtLCAxLCAzMikpCglmcmFtZV9kaWcgLTIgLy8gcGF0aDogUGF0aAoJc3RvcmUgMjU1IC8vIGZ1bGwgYXJyYXkKCWludCAwIC8vIGluaXRpYWwgb2Zmc2V0CglmcmFtZV9kaWcgMSAvLyBzYXZlZCBhY2Nlc3NvcjogYWNjZXNzb3IvLzAvL2VsZW0KCWludCAzMwoJKiAvLyBhY2MgKiB0eXBlTGVuZ3RoCgkrCglsb2FkIDI1NSAvLyBmdWxsIGFycmF5Cglzd2FwCglpbnQgMzMKCWV4dHJhY3QzCglleHRyYWN0IDEgMzIKCWZyYW1lX2RpZyAtMSAvLyBsZWFmOiBieXRlMzIKCWNhbGxzdWIgaGFzaENvbmNhdAoJZnJhbWVfYnVyeSAtMSAvLyByZXN1bHQ6IGJ5dGUzMgoJYiBpZjBfZW5kCgppZjBfZWxzZToKCS8vIGV4YW1wbGVzL21lcmtsZS9tZXJrbGUuYWxnby50czo0NQoJLy8gcmVzdWx0ID0gdGhpcy5oYXNoQ29uY2F0KGV4dHJhY3QzKGVsZW0sIDEsIDMyKSwgcmVzdWx0KQoJZnJhbWVfZGlnIC0xIC8vIGxlYWY6IGJ5dGUzMgoJZnJhbWVfZGlnIC0yIC8vIHBhdGg6IFBhdGgKCXN0b3JlIDI1NSAvLyBmdWxsIGFycmF5CglpbnQgMCAvLyBpbml0aWFsIG9mZnNldAoJZnJhbWVfZGlnIDEgLy8gc2F2ZWQgYWNjZXNzb3I6IGFjY2Vzc29yLy8wLy9lbGVtCglpbnQgMzMKCSogLy8gYWNjICogdHlwZUxlbmd0aAoJKwoJbG9hZCAyNTUgLy8gZnVsbCBhcnJheQoJc3dhcAoJaW50IDMzCglleHRyYWN0MwoJZXh0cmFjdCAxIDMyCgljYWxsc3ViIGhhc2hDb25jYXQKCWZyYW1lX2J1cnkgLTEgLy8gcmVzdWx0OiBieXRlMzIKCmlmMF9lbmQ6CgkvLyBleGFtcGxlcy9tZXJrbGUvbWVya2xlLmFsZ28udHM6MzkKCS8vIGkgPSBpICsgMQoJZnJhbWVfZGlnIDAgLy8gaTogdWludDY0CglpbnQgMQoJKwoJZnJhbWVfYnVyeSAwIC8vIGk6IHVpbnQ2NAoJYiBmb3JfMQoKZm9yXzFfZW5kOgoJLy8gZXhhbXBsZXMvbWVya2xlL21lcmtsZS5hbGdvLnRzOjQ5CgkvLyByZXR1cm4gcmVzdWx0OwoJZnJhbWVfZGlnIC0xIC8vIGxlYWY6IGJ5dGUzMgoKCS8vIHNldCB0aGUgc3Vicm91dGluZSByZXR1cm4gdmFsdWUKCWZyYW1lX2J1cnkgMAoKCS8vIHBvcCBhbGwgbG9jYWwgdmFyaWFibGVzIGZyb20gdGhlIHN0YWNrCglwb3BuIDEKCXJldHN1YgoKYWJpX3JvdXRlX2RlbGV0ZUFwcGxpY2F0aW9uOgoJLy8gZXhlY3V0ZSBkZWxldGVBcHBsaWNhdGlvbigpdm9pZAoJY2FsbHN1YiBkZWxldGVBcHBsaWNhdGlvbgoJaW50IDEKCXJldHVybgoKLy8gZGVsZXRlQXBwbGljYXRpb24oKXZvaWQKZGVsZXRlQXBwbGljYXRpb246Cglwcm90byAwIDAKCgkvLyBleGFtcGxlcy9tZXJrbGUvbWVya2xlLmFsZ28udHM6NTMKCS8vIHZlcmlmeUFwcENhbGxUeG4odGhpcy50eG4sIHsgc2VuZGVyOiB0aGlzLmFwcC5jcmVhdG9yIH0pCgkvLyB2ZXJpZnkgc2VuZGVyCgl0eG4gU2VuZGVyCgl0eG5hIEFwcGxpY2F0aW9ucyAwCglhcHBfcGFyYW1zX2dldCBBcHBDcmVhdG9yCglhc3NlcnQKCT09Cglhc3NlcnQKCXJldHN1YgoKYWJpX3JvdXRlX2NyZWF0ZUFwcGxpY2F0aW9uOgoJLy8gZXhlY3V0ZSBjcmVhdGVBcHBsaWNhdGlvbigpdm9pZAoJY2FsbHN1YiBjcmVhdGVBcHBsaWNhdGlvbgoJaW50IDEKCXJldHVybgoKLy8gY3JlYXRlQXBwbGljYXRpb24oKXZvaWQKY3JlYXRlQXBwbGljYXRpb246Cglwcm90byAwIDAKCgkvLyBleGFtcGxlcy9tZXJrbGUvbWVya2xlLmFsZ28udHM6NTcKCS8vIHRoaXMucm9vdC52YWx1ZSA9IHRoaXMuY2FsY0luaXRSb290KCkKCWJ5dGUgMHg3MjZmNmY3NCAvLyAicm9vdCIKCWNhbGxzdWIgY2FsY0luaXRSb290CglhcHBfZ2xvYmFsX3B1dAoJcmV0c3ViCgphYmlfcm91dGVfdmVyaWZ5OgoJLy8gcGF0aDogYnl0ZVszM11bM10KCXR4bmEgQXBwbGljYXRpb25BcmdzIDIKCWR1cAoJbGVuCglpbnQgOTkKCT09Cglhc3NlcnQKCgkvLyBkYXRhOiBieXRlW10KCXR4bmEgQXBwbGljYXRpb25BcmdzIDEKCWV4dHJhY3QgMiAwCgoJLy8gZXhlY3V0ZSB2ZXJpZnkoYnl0ZVszM11bM10sYnl0ZVtdKXZvaWQKCWNhbGxzdWIgdmVyaWZ5CglpbnQgMQoJcmV0dXJuCgovLyB2ZXJpZnkoYnl0ZVszM11bM10sYnl0ZVtdKXZvaWQKdmVyaWZ5OgoJcHJvdG8gMiAwCgoJLy8gZXhhbXBsZXMvbWVya2xlL21lcmtsZS5hbGdvLnRzOjYxCgkvLyBhc3NlcnQodGhpcy5yb290LnZhbHVlID09PSB0aGlzLmNhbGNSb290KHNoYTI1NihkYXRhKSwgcGF0aCkpCglieXRlIDB4NzI2ZjZmNzQgLy8gInJvb3QiCglhcHBfZ2xvYmFsX2dldAoJZnJhbWVfZGlnIC0yIC8vIHBhdGg6IFBhdGgKCWZyYW1lX2RpZyAtMSAvLyBkYXRhOiBieXRlcwoJc2hhMjU2CgljYWxsc3ViIGNhbGNSb290Cgk9PQoJYXNzZXJ0CglyZXRzdWIKCmFiaV9yb3V0ZV9hcHBlbmRMZWFmOgoJLy8gcGF0aDogYnl0ZVszM11bM10KCXR4bmEgQXBwbGljYXRpb25BcmdzIDIKCWR1cAoJbGVuCglpbnQgOTkKCT09Cglhc3NlcnQKCgkvLyBkYXRhOiBieXRlW10KCXR4bmEgQXBwbGljYXRpb25BcmdzIDEKCWV4dHJhY3QgMiAwCgoJLy8gZXhlY3V0ZSBhcHBlbmRMZWFmKGJ5dGVbMzNdWzNdLGJ5dGVbXSl2b2lkCgljYWxsc3ViIGFwcGVuZExlYWYKCWludCAxCglyZXR1cm4KCi8vIGFwcGVuZExlYWYoYnl0ZVszM11bM10sYnl0ZVtdKXZvaWQKYXBwZW5kTGVhZjoKCXByb3RvIDIgMAoKCS8vIGV4YW1wbGVzL21lcmtsZS9tZXJrbGUuYWxnby50czo2NQoJLy8gYXNzZXJ0KGRhdGEgIT09ICcnKQoJZnJhbWVfZGlnIC0xIC8vIGRhdGE6IGJ5dGVzCglieXRlIDB4IC8vICIiCgkhPQoJYXNzZXJ0CgoJLy8gZXhhbXBsZXMvbWVya2xlL21lcmtsZS5hbGdvLnRzOjY2CgkvLyBhc3NlcnQodGhpcy5yb290LnZhbHVlID09PSB0aGlzLmNhbGNSb290KEVNUFRZX0hBU0gsIHBhdGgpKQoJYnl0ZSAweDcyNmY2Zjc0IC8vICJyb290IgoJYXBwX2dsb2JhbF9nZXQKCWZyYW1lX2RpZyAtMiAvLyBwYXRoOiBQYXRoCgoJLy8gZXhhbXBsZXMvbWVya2xlL21lcmtsZS5hbGdvLnRzOjYKCS8vIGhleCgnZTNiMGM0NDI5OGZjMWMxNDlhZmJmNGM4OTk2ZmI5MjQyN2FlNDFlNDY0OWI5MzRjYTQ5NTk5MWI3ODUyYjg1NScpCglieXRlIDB4ZTNiMGM0NDI5OGZjMWMxNDlhZmJmNGM4OTk2ZmI5MjQyN2FlNDFlNDY0OWI5MzRjYTQ5NTk5MWI3ODUyYjg1NTAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAKCWJ5dGUgMHgKCWR1cAoJYj09Cglhc3NlcnQKCWV4dHJhY3QgMCAzMgoJY2FsbHN1YiBjYWxjUm9vdAoJPT0KCWFzc2VydAoKCS8vIGV4YW1wbGVzL21lcmtsZS9tZXJrbGUuYWxnby50czo2OAoJLy8gdGhpcy5yb290LnZhbHVlID0gdGhpcy5jYWxjUm9vdChzaGEyNTYoZGF0YSksIHBhdGgpCglieXRlIDB4NzI2ZjZmNzQgLy8gInJvb3QiCglmcmFtZV9kaWcgLTIgLy8gcGF0aDogUGF0aAoJZnJhbWVfZGlnIC0xIC8vIGRhdGE6IGJ5dGVzCglzaGEyNTYKCWNhbGxzdWIgY2FsY1Jvb3QKCWFwcF9nbG9iYWxfcHV0CgoJLy8gZXhhbXBsZXMvbWVya2xlL21lcmtsZS5hbGdvLnRzOjcwCgkvLyB0aGlzLnNpemUudmFsdWUgPSB0aGlzLnNpemUudmFsdWUgKyAxCglieXRlIDB4NzM2OTdhNjUgLy8gInNpemUiCglkdXAKCWFwcF9nbG9iYWxfZ2V0CglpbnQgMQoJKwoJYXBwX2dsb2JhbF9wdXQKCXJldHN1YgoKYWJpX3JvdXRlX3VwZGF0ZUxlYWY6CgkvLyBwYXRoOiBieXRlWzMzXVszXQoJdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMwoJZHVwCglsZW4KCWludCA5OQoJPT0KCWFzc2VydAoKCS8vIG5ld0RhdGE6IGJ5dGVbXQoJdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMgoJZXh0cmFjdCAyIDAKCgkvLyBvbGREYXRhOiBieXRlW10KCXR4bmEgQXBwbGljYXRpb25BcmdzIDEKCWV4dHJhY3QgMiAwCgoJLy8gZXhlY3V0ZSB1cGRhdGVMZWFmKGJ5dGVbMzNdWzNdLGJ5dGVbXSxieXRlW10pdm9pZAoJY2FsbHN1YiB1cGRhdGVMZWFmCglpbnQgMQoJcmV0dXJuCgovLyB1cGRhdGVMZWFmKGJ5dGVbMzNdWzNdLGJ5dGVbXSxieXRlW10pdm9pZAp1cGRhdGVMZWFmOgoJcHJvdG8gMyAwCgoJLy8gZXhhbXBsZXMvbWVya2xlL21lcmtsZS5hbGdvLnRzOjc0CgkvLyBhc3NlcnQobmV3RGF0YSAhPT0gJycpCglmcmFtZV9kaWcgLTIgLy8gbmV3RGF0YTogYnl0ZXMKCWJ5dGUgMHggLy8gIiIKCSE9Cglhc3NlcnQKCgkvLyBleGFtcGxlcy9tZXJrbGUvbWVya2xlLmFsZ28udHM6NzUKCS8vIGFzc2VydCh0aGlzLnJvb3QudmFsdWUgPT09IHRoaXMuY2FsY1Jvb3Qoc2hhMjU2KG9sZERhdGEpLCBwYXRoKSkKCWJ5dGUgMHg3MjZmNmY3NCAvLyAicm9vdCIKCWFwcF9nbG9iYWxfZ2V0CglmcmFtZV9kaWcgLTMgLy8gcGF0aDogUGF0aAoJZnJhbWVfZGlnIC0xIC8vIG9sZERhdGE6IGJ5dGVzCglzaGEyNTYKCWNhbGxzdWIgY2FsY1Jvb3QKCT09Cglhc3NlcnQKCgkvLyBleGFtcGxlcy9tZXJrbGUvbWVya2xlLmFsZ28udHM6NzcKCS8vIHRoaXMucm9vdC52YWx1ZSA9IHRoaXMuY2FsY1Jvb3Qoc2hhMjU2KG5ld0RhdGEpLCBwYXRoKQoJYnl0ZSAweDcyNmY2Zjc0IC8vICJyb290IgoJZnJhbWVfZGlnIC0zIC8vIHBhdGg6IFBhdGgKCWZyYW1lX2RpZyAtMiAvLyBuZXdEYXRhOiBieXRlcwoJc2hhMjU2CgljYWxsc3ViIGNhbGNSb290CglhcHBfZ2xvYmFsX3B1dAoJcmV0c3ViCgpjcmVhdGVfTm9PcDoKCW1ldGhvZCAiY3JlYXRlQXBwbGljYXRpb24oKXZvaWQiCgl0eG5hIEFwcGxpY2F0aW9uQXJncyAwCgltYXRjaCBhYmlfcm91dGVfY3JlYXRlQXBwbGljYXRpb24KCWVycgoKY2FsbF9Ob09wOgoJbWV0aG9kICJ2ZXJpZnkoYnl0ZVtdLGJ5dGVbMzNdWzNdKXZvaWQiCgltZXRob2QgImFwcGVuZExlYWYoYnl0ZVtdLGJ5dGVbMzNdWzNdKXZvaWQiCgltZXRob2QgInVwZGF0ZUxlYWYoYnl0ZVtdLGJ5dGVbXSxieXRlWzMzXVszXSl2b2lkIgoJdHhuYSBBcHBsaWNhdGlvbkFyZ3MgMAoJbWF0Y2ggYWJpX3JvdXRlX3ZlcmlmeSBhYmlfcm91dGVfYXBwZW5kTGVhZiBhYmlfcm91dGVfdXBkYXRlTGVhZgoJZXJyCgpjYWxsX0RlbGV0ZUFwcGxpY2F0aW9uOgoJbWV0aG9kICJkZWxldGVBcHBsaWNhdGlvbigpdm9pZCIKCXR4bmEgQXBwbGljYXRpb25BcmdzIDAKCW1hdGNoIGFiaV9yb3V0ZV9kZWxldGVBcHBsaWNhdGlvbgoJZXJy",
    "clear": "I3ByYWdtYSB2ZXJzaW9uIDk="
  },
  "contract": {
    "name": "MerkleTree",
    "desc": "",
    "methods": [
      {
        "name": "deleteApplication",
        "args": [],
        "returns": {
          "type": "void"
        }
      },
      {
        "name": "createApplication",
        "args": [],
        "returns": {
          "type": "void"
        }
      },
      {
        "name": "verify",
        "args": [
          {
            "name": "data",
            "type": "byte[]"
          },
          {
            "name": "path",
            "type": "byte[33][3]"
          }
        ],
        "returns": {
          "type": "void"
        }
      },
      {
        "name": "appendLeaf",
        "args": [
          {
            "name": "data",
            "type": "byte[]"
          },
          {
            "name": "path",
            "type": "byte[33][3]"
          }
        ],
        "returns": {
          "type": "void"
        }
      },
      {
        "name": "updateLeaf",
        "args": [
          {
            "name": "oldData",
            "type": "byte[]"
          },
          {
            "name": "newData",
            "type": "byte[]"
          },
          {
            "name": "path",
            "type": "byte[33][3]"
          }
        ],
        "returns": {
          "type": "void"
        }
      }
    ]
  }
}

/**
 * Defines an onCompletionAction of 'no_op'
 */
export type OnCompleteNoOp =  { onCompleteAction?: 'no_op' | OnApplicationComplete.NoOpOC }
/**
 * Defines an onCompletionAction of 'opt_in'
 */
export type OnCompleteOptIn =  { onCompleteAction: 'opt_in' | OnApplicationComplete.OptInOC }
/**
 * Defines an onCompletionAction of 'close_out'
 */
export type OnCompleteCloseOut =  { onCompleteAction: 'close_out' | OnApplicationComplete.CloseOutOC }
/**
 * Defines an onCompletionAction of 'delete_application'
 */
export type OnCompleteDelApp =  { onCompleteAction: 'delete_application' | OnApplicationComplete.DeleteApplicationOC }
/**
 * Defines an onCompletionAction of 'update_application'
 */
export type OnCompleteUpdApp =  { onCompleteAction: 'update_application' | OnApplicationComplete.UpdateApplicationOC }
/**
 * A state record containing a single unsigned integer
 */
export type IntegerState = {
  /**
   * Gets the state value as a BigInt 
   */
  asBigInt(): bigint
  /**
   * Gets the state value as a number.
   */
  asNumber(): number
}
/**
 * A state record containing binary data
 */
export type BinaryState = {
  /**
   * Gets the state value as a Uint8Array
   */
  asByteArray(): Uint8Array
  /**
   * Gets the state value as a string
   */
  asString(): string
}

/**
 * Defines the types of available calls and state of the MerkleTree smart contract.
 */
export type MerkleTree = {
  /**
   * Maps method signatures / names to their argument and return types.
   */
  methods:
    & Record<'deleteApplication()void' | 'deleteApplication', {
      argsObj: {
      }
      argsTuple: []
      returns: void
    }>
    & Record<'createApplication()void' | 'createApplication', {
      argsObj: {
      }
      argsTuple: []
      returns: void
    }>
    & Record<'verify(byte[],byte[33][3])void' | 'verify', {
      argsObj: {
        data: Uint8Array
        path: [Uint8Array, Uint8Array, Uint8Array]
      }
      argsTuple: [data: Uint8Array, path: [Uint8Array, Uint8Array, Uint8Array]]
      returns: void
    }>
    & Record<'appendLeaf(byte[],byte[33][3])void' | 'appendLeaf', {
      argsObj: {
        data: Uint8Array
        path: [Uint8Array, Uint8Array, Uint8Array]
      }
      argsTuple: [data: Uint8Array, path: [Uint8Array, Uint8Array, Uint8Array]]
      returns: void
    }>
    & Record<'updateLeaf(byte[],byte[],byte[33][3])void' | 'updateLeaf', {
      argsObj: {
        oldData: Uint8Array
        newData: Uint8Array
        path: [Uint8Array, Uint8Array, Uint8Array]
      }
      argsTuple: [oldData: Uint8Array, newData: Uint8Array, path: [Uint8Array, Uint8Array, Uint8Array]]
      returns: void
    }>
  /**
   * Defines the shape of the global and local state of the application.
   */
  state: {
    global: {
      'root'?: BinaryState
      'size'?: IntegerState
    }
  }
}
/**
 * Defines the possible abi call signatures
 */
export type MerkleTreeSig = keyof MerkleTree['methods']
/**
 * Defines an object containing all relevant parameters for a single call to the contract. Where TSignature is undefined, a bare call is made
 */
export type TypedCallParams<TSignature extends MerkleTreeSig | undefined> = {
  method: TSignature
  methodArgs: TSignature extends undefined ? undefined : Array<ABIAppCallArg | undefined>
} & AppClientCallCoreParams & CoreAppCallArgs
/**
 * Defines the arguments required for a bare call
 */
export type BareCallArgs = Omit<RawAppCallArgs, keyof CoreAppCallArgs>
/**
 * Maps a method signature from the MerkleTree smart contract to the method's arguments in either tuple of struct form
 */
export type MethodArgs<TSignature extends MerkleTreeSig> = MerkleTree['methods'][TSignature]['argsObj' | 'argsTuple']
/**
 * Maps a method signature from the MerkleTree smart contract to the method's return type
 */
export type MethodReturn<TSignature extends MerkleTreeSig> = MerkleTree['methods'][TSignature]['returns']

/**
 * A factory for available 'create' calls
 */
export type MerkleTreeCreateCalls = (typeof MerkleTreeCallFactory)['create']
/**
 * Defines supported create methods for this smart contract
 */
export type MerkleTreeCreateCallParams =
  | (TypedCallParams<'createApplication()void'> & (OnCompleteNoOp))
/**
 * A factory for available 'delete' calls
 */
export type MerkleTreeDeleteCalls = (typeof MerkleTreeCallFactory)['delete']
/**
 * Defines supported delete methods for this smart contract
 */
export type MerkleTreeDeleteCallParams =
  | TypedCallParams<'deleteApplication()void'>
/**
 * Defines arguments required for the deploy method.
 */
export type MerkleTreeDeployArgs = {
  deployTimeParams?: TealTemplateParams
  /**
   * A delegate which takes a create call factory and returns the create call params for this smart contract
   */
  createCall?: (callFactory: MerkleTreeCreateCalls) => MerkleTreeCreateCallParams
  /**
   * A delegate which takes a delete call factory and returns the delete call params for this smart contract
   */
  deleteCall?: (callFactory: MerkleTreeDeleteCalls) => MerkleTreeDeleteCallParams
}


/**
 * Exposes methods for constructing all available smart contract calls
 */
export abstract class MerkleTreeCallFactory {
  /**
   * Gets available create call factories
   */
  static get create() {
    return {
      /**
       * Constructs a create call for the MerkleTree smart contract using the createApplication()void ABI method
       *
       * @param args Any args for the contract call
       * @param params Any additional parameters for the call
       * @returns A TypedCallParams object for the call
       */
      createApplication(args: MethodArgs<'createApplication()void'>, params: AppClientCallCoreParams & CoreAppCallArgs & AppClientCompilationParams & (OnCompleteNoOp) = {}) {
        return {
          method: 'createApplication()void' as const,
          methodArgs: Array.isArray(args) ? args : [],
          ...params,
        }
      },
    }
  }

  /**
   * Gets available delete call factories
   */
  static get delete() {
    return {
      /**
       * Constructs a delete call for the MerkleTree smart contract using the deleteApplication()void ABI method
       *
       * @param args Any args for the contract call
       * @param params Any additional parameters for the call
       * @returns A TypedCallParams object for the call
       */
      deleteApplication(args: MethodArgs<'deleteApplication()void'>, params: AppClientCallCoreParams & CoreAppCallArgs = {}) {
        return {
          method: 'deleteApplication()void' as const,
          methodArgs: Array.isArray(args) ? args : [],
          ...params,
        }
      },
    }
  }

  /**
   * Constructs a no op call for the verify(byte[],byte[33][3])void ABI method
   *
   * @param args Any args for the contract call
   * @param params Any additional parameters for the call
   * @returns A TypedCallParams object for the call
   */
  static verify(args: MethodArgs<'verify(byte[],byte[33][3])void'>, params: AppClientCallCoreParams & CoreAppCallArgs) {
    return {
      method: 'verify(byte[],byte[33][3])void' as const,
      methodArgs: Array.isArray(args) ? args : [args.data, args.path],
      ...params,
    }
  }
  /**
   * Constructs a no op call for the appendLeaf(byte[],byte[33][3])void ABI method
   *
   * @param args Any args for the contract call
   * @param params Any additional parameters for the call
   * @returns A TypedCallParams object for the call
   */
  static appendLeaf(args: MethodArgs<'appendLeaf(byte[],byte[33][3])void'>, params: AppClientCallCoreParams & CoreAppCallArgs) {
    return {
      method: 'appendLeaf(byte[],byte[33][3])void' as const,
      methodArgs: Array.isArray(args) ? args : [args.data, args.path],
      ...params,
    }
  }
  /**
   * Constructs a no op call for the updateLeaf(byte[],byte[],byte[33][3])void ABI method
   *
   * @param args Any args for the contract call
   * @param params Any additional parameters for the call
   * @returns A TypedCallParams object for the call
   */
  static updateLeaf(args: MethodArgs<'updateLeaf(byte[],byte[],byte[33][3])void'>, params: AppClientCallCoreParams & CoreAppCallArgs) {
    return {
      method: 'updateLeaf(byte[],byte[],byte[33][3])void' as const,
      methodArgs: Array.isArray(args) ? args : [args.oldData, args.newData, args.path],
      ...params,
    }
  }
}

/**
 * A client to make calls to the MerkleTree smart contract
 */
export class MerkleTreeClient {
  /**
   * The underlying `ApplicationClient` for when you want to have more flexibility
   */
  public readonly appClient: ApplicationClient

  private readonly sender: SendTransactionFrom | undefined

  /**
   * Creates a new instance of `MerkleTreeClient`
   *
   * @param appDetails appDetails The details to identify the app to deploy
   * @param algod An algod client instance
   */
  constructor(appDetails: AppDetails, private algod: Algodv2) {
    this.sender = appDetails.sender
    this.appClient = algokit.getAppClient({
      ...appDetails,
      app: APP_SPEC
    }, algod)
  }

  /**
   * Checks for decode errors on the AppCallTransactionResult and maps the return value to the specified generic type
   *
   * @param result The AppCallTransactionResult to be mapped
   * @param returnValueFormatter An optional delegate to format the return value if required
   * @returns The smart contract response with an updated return value
   */
  protected mapReturnValue<TReturn>(result: AppCallTransactionResult, returnValueFormatter?: (value: any) => TReturn): AppCallTransactionResultOfType<TReturn> {
    if(result.return?.decodeError) {
      throw result.return.decodeError
    }
    const returnValue = result.return?.returnValue !== undefined && returnValueFormatter !== undefined
      ? returnValueFormatter(result.return.returnValue)
      : result.return?.returnValue as TReturn | undefined
      return { ...result, return: returnValue }
  }

  /**
   * Calls the ABI method with the matching signature using an onCompletion code of NO_OP
   *
   * @param typedCallParams An object containing the method signature, args, and any other relevant parameters
   * @param returnValueFormatter An optional delegate which when provided will be used to map non-undefined return values to the target type
   * @returns The result of the smart contract call
   */
  public async call<TSignature extends keyof MerkleTree['methods']>(typedCallParams: TypedCallParams<TSignature>, returnValueFormatter?: (value: any) => MethodReturn<TSignature>) {
    return this.mapReturnValue<MethodReturn<TSignature>>(await this.appClient.call(typedCallParams), returnValueFormatter)
  }

  /**
   * Idempotently deploys the MerkleTree smart contract.
   *
   * @param params The arguments for the contract calls and any additional parameters for the call
   * @returns The deployment result
   */
  public deploy(params: MerkleTreeDeployArgs & AppClientDeployCoreParams = {}): ReturnType<ApplicationClient['deploy']> {
    const createArgs = params.createCall?.(MerkleTreeCallFactory.create)
    const deleteArgs = params.deleteCall?.(MerkleTreeCallFactory.delete)
    return this.appClient.deploy({
      ...params,
      deleteArgs,
      createArgs,
      createOnCompleteAction: createArgs?.onCompleteAction,
    })
  }

  /**
   * Gets available create methods
   */
  public get create() {
    const $this = this
    return {
      /**
       * Creates a new instance of the MerkleTree smart contract using the createApplication()void ABI method.
       *
       * @param args The arguments for the smart contract call
       * @param params Any additional parameters for the call
       * @returns The create result
       */
      async createApplication(args: MethodArgs<'createApplication()void'>, params: AppClientCallCoreParams & AppClientCompilationParams & (OnCompleteNoOp) = {}): Promise<AppCallTransactionResultOfType<MethodReturn<'createApplication()void'>>> {
        return $this.mapReturnValue(await $this.appClient.create(MerkleTreeCallFactory.create.createApplication(args, params)))
      },
    }
  }

  /**
   * Gets available delete methods
   */
  public get delete() {
    const $this = this
    return {
      /**
       * Deletes an existing instance of the MerkleTree smart contract using the deleteApplication()void ABI method.
       *
       * @param args The arguments for the smart contract call
       * @param params Any additional parameters for the call
       * @returns The delete result
       */
      async deleteApplication(args: MethodArgs<'deleteApplication()void'>, params: AppClientCallCoreParams = {}): Promise<AppCallTransactionResultOfType<MethodReturn<'deleteApplication()void'>>> {
        return $this.mapReturnValue(await $this.appClient.delete(MerkleTreeCallFactory.delete.deleteApplication(args, params)))
      },
    }
  }

  /**
   * Makes a clear_state call to an existing instance of the MerkleTree smart contract.
   *
   * @param args The arguments for the bare call
   * @returns The clear_state result
   */
  public clearState(args: BareCallArgs & AppClientCallCoreParams & CoreAppCallArgs = {}) {
    return this.appClient.clearState(args)
  }

  /**
   * Calls the verify(byte[],byte[33][3])void ABI method.
   *
   * @param args The arguments for the contract call
   * @param params Any additional parameters for the call
   * @returns The result of the call
   */
  public verify(args: MethodArgs<'verify(byte[],byte[33][3])void'>, params: AppClientCallCoreParams & CoreAppCallArgs = {}) {
    return this.call(MerkleTreeCallFactory.verify(args, params))
  }

  /**
   * Calls the appendLeaf(byte[],byte[33][3])void ABI method.
   *
   * @param args The arguments for the contract call
   * @param params Any additional parameters for the call
   * @returns The result of the call
   */
  public appendLeaf(args: MethodArgs<'appendLeaf(byte[],byte[33][3])void'>, params: AppClientCallCoreParams & CoreAppCallArgs = {}) {
    return this.call(MerkleTreeCallFactory.appendLeaf(args, params))
  }

  /**
   * Calls the updateLeaf(byte[],byte[],byte[33][3])void ABI method.
   *
   * @param args The arguments for the contract call
   * @param params Any additional parameters for the call
   * @returns The result of the call
   */
  public updateLeaf(args: MethodArgs<'updateLeaf(byte[],byte[],byte[33][3])void'>, params: AppClientCallCoreParams & CoreAppCallArgs = {}) {
    return this.call(MerkleTreeCallFactory.updateLeaf(args, params))
  }

  /**
   * Extracts a binary state value out of an AppState dictionary
   *
   * @param state The state dictionary containing the state value
   * @param key The key of the state value
   * @returns A BinaryState instance containing the state value, or undefined if the key was not found
   */
  private static getBinaryState(state: AppState, key: string): BinaryState | undefined {
    const value = state[key]
    if (!value) return undefined
    if (!('valueRaw' in value))
      throw new Error(`Failed to parse state value for ${key}; received an int when expected a byte array`)
    return {
      asString(): string {
        return value.value
      },
      asByteArray(): Uint8Array {
        return value.valueRaw
      }
    }
  }

  /**
   * Extracts a integer state value out of an AppState dictionary
   *
   * @param state The state dictionary containing the state value
   * @param key The key of the state value
   * @returns An IntegerState instance containing the state value, or undefined if the key was not found
   */
  private static getIntegerState(state: AppState, key: string): IntegerState | undefined {
    const value = state[key]
    if (!value) return undefined
    if ('valueRaw' in value)
      throw new Error(`Failed to parse state value for ${key}; received a byte array when expected a number`)
    return {
      asBigInt() {
        return typeof value.value === 'bigint' ? value.value : BigInt(value.value)
      },
      asNumber(): number {
        return typeof value.value === 'bigint' ? Number(value.value) : value.value
      },
    }
  }

  /**
   * Returns the smart contract's global state wrapped in a strongly typed accessor with options to format the stored value
   */
  public async getGlobalState(): Promise<MerkleTree['state']['global']> {
    const state = await this.appClient.getGlobalState()
    return {
      get root() {
        return MerkleTreeClient.getBinaryState(state, 'root')
      },
      get size() {
        return MerkleTreeClient.getIntegerState(state, 'size')
      },
    }
  }

  public compose(): MerkleTreeComposer {
    const client = this
    const atc = new AtomicTransactionComposer()
    let promiseChain:Promise<unknown> = Promise.resolve()
    const resultMappers: Array<undefined | ((x: any) => any)> = []
    return {
      verify(args: MethodArgs<'verify(byte[],byte[33][3])void'>, params?: AppClientCallCoreParams & CoreAppCallArgs) {
        promiseChain = promiseChain.then(() => client.verify(args, {...params, sendParams: {...params?.sendParams, skipSending: true, atc}}))
        resultMappers.push(undefined)
        return this
      },
      appendLeaf(args: MethodArgs<'appendLeaf(byte[],byte[33][3])void'>, params?: AppClientCallCoreParams & CoreAppCallArgs) {
        promiseChain = promiseChain.then(() => client.appendLeaf(args, {...params, sendParams: {...params?.sendParams, skipSending: true, atc}}))
        resultMappers.push(undefined)
        return this
      },
      updateLeaf(args: MethodArgs<'updateLeaf(byte[],byte[],byte[33][3])void'>, params?: AppClientCallCoreParams & CoreAppCallArgs) {
        promiseChain = promiseChain.then(() => client.updateLeaf(args, {...params, sendParams: {...params?.sendParams, skipSending: true, atc}}))
        resultMappers.push(undefined)
        return this
      },
      get delete() {
        const $this = this
        return {
          deleteApplication(args: MethodArgs<'deleteApplication()void'>, params?: AppClientCallCoreParams) {
            promiseChain = promiseChain.then(() => client.delete.deleteApplication(args, {...params, sendParams: {...params?.sendParams, skipSending: true, atc}}))
            resultMappers.push(undefined)
            return $this
          },
        }
      },
      clearState(args?: BareCallArgs & AppClientCallCoreParams & CoreAppCallArgs) {
        promiseChain = promiseChain.then(() => client.clearState({...args, sendParams: {...args?.sendParams, skipSending: true, atc}}))
        resultMappers.push(undefined)
        return this
      },
      addTransaction(txn: TransactionWithSigner | TransactionToSign | Transaction | Promise<SendTransactionResult>, defaultSender?: SendTransactionFrom) {
        promiseChain = promiseChain.then(async () => atc.addTransaction(await algokit.getTransactionWithSigner(txn, defaultSender ?? client.sender)))
        return this
      },
      async atc() {
        await promiseChain
        return atc
      },
      async execute() {
        await promiseChain
        const result = await algokit.sendAtomicTransactionComposer({ atc, sendParams: {} }, client.algod)
        return {
          ...result,
          returns: result.returns?.map((val, i) => resultMappers[i] !== undefined ? resultMappers[i]!(val.returnValue) : val.returnValue)
        }
      }
    } as unknown as MerkleTreeComposer
  }
}
export type MerkleTreeComposer<TReturns extends [...any[]] = []> = {
  /**
   * Calls the verify(byte[],byte[33][3])void ABI method.
   *
   * @param args The arguments for the contract call
   * @param params Any additional parameters for the call
   * @returns The typed transaction composer so you can fluently chain multiple calls or call execute to execute all queued up transactions
   */
  verify(args: MethodArgs<'verify(byte[],byte[33][3])void'>, params?: AppClientCallCoreParams & CoreAppCallArgs): MerkleTreeComposer<[...TReturns, MethodReturn<'verify(byte[],byte[33][3])void'>]>

  /**
   * Calls the appendLeaf(byte[],byte[33][3])void ABI method.
   *
   * @param args The arguments for the contract call
   * @param params Any additional parameters for the call
   * @returns The typed transaction composer so you can fluently chain multiple calls or call execute to execute all queued up transactions
   */
  appendLeaf(args: MethodArgs<'appendLeaf(byte[],byte[33][3])void'>, params?: AppClientCallCoreParams & CoreAppCallArgs): MerkleTreeComposer<[...TReturns, MethodReturn<'appendLeaf(byte[],byte[33][3])void'>]>

  /**
   * Calls the updateLeaf(byte[],byte[],byte[33][3])void ABI method.
   *
   * @param args The arguments for the contract call
   * @param params Any additional parameters for the call
   * @returns The typed transaction composer so you can fluently chain multiple calls or call execute to execute all queued up transactions
   */
  updateLeaf(args: MethodArgs<'updateLeaf(byte[],byte[],byte[33][3])void'>, params?: AppClientCallCoreParams & CoreAppCallArgs): MerkleTreeComposer<[...TReturns, MethodReturn<'updateLeaf(byte[],byte[],byte[33][3])void'>]>

  /**
   * Gets available delete methods
   */
  readonly delete: {
    /**
     * Deletes an existing instance of the MerkleTree smart contract using the deleteApplication()void ABI method.
     *
     * @param args The arguments for the smart contract call
     * @param params Any additional parameters for the call
     * @returns The typed transaction composer so you can fluently chain multiple calls or call execute to execute all queued up transactions
     */
    deleteApplication(args: MethodArgs<'deleteApplication()void'>, params?: AppClientCallCoreParams): MerkleTreeComposer<[...TReturns, MethodReturn<'deleteApplication()void'>]>
  }

  /**
   * Makes a clear_state call to an existing instance of the MerkleTree smart contract.
   *
   * @param args The arguments for the bare call
   * @returns The typed transaction composer so you can fluently chain multiple calls or call execute to execute all queued up transactions
   */
  clearState(args?: BareCallArgs & AppClientCallCoreParams & CoreAppCallArgs): MerkleTreeComposer<[...TReturns, undefined]>

  /**
   * Adds a transaction to the composer
   *
   * @param txn One of: A TransactionWithSigner object (returned as is), a TransactionToSign object (signer is obtained from the signer property), a Transaction object (signer is extracted from the defaultSender parameter), an async SendTransactionResult returned by one of algokit utils helpers (signer is obtained from the defaultSender parameter)
   * @param defaultSender The default sender to be used to obtain a signer where the object provided to the transaction parameter does not include a signer.
   */
  addTransaction(txn: TransactionWithSigner | TransactionToSign | Transaction | Promise<SendTransactionResult>, defaultSender?: SendTransactionFrom): MerkleTreeComposer<TReturns>
  /**
   * Returns the underlying AtomicTransactionComposer instance
   */
  atc(): Promise<AtomicTransactionComposer>
  /**
   * Executes the transaction group and returns an array of results
   */
  execute(): Promise<MerkleTreeComposerResults<TReturns>>
}
export type MerkleTreeComposerResults<TReturns extends [...any[]]> = {
  returns: TReturns
  groupId: string
  txIds: string[]
  transactions: Transaction[]
}
