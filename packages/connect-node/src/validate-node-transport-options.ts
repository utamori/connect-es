// Copyright 2021-2023 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type * as http2 from "node:http2";
import type * as http from "node:http";
import type * as https from "node:https";
import type {
  BinaryReadOptions,
  BinaryWriteOptions,
  JsonReadOptions,
  JsonWriteOptions,
} from "@bufbuild/protobuf";
import type { Interceptor } from "@bufbuild/connect";
import {
  Compression,
  validateReadWriteMaxBytes,
} from "@bufbuild/connect/protocol";
import { compressionBrotli, compressionGzip } from "./compression.js";
import {
  createNodeHttp1Client,
  createNodeHttp2Client,
} from "./node-universal-client.js";

export interface NodeHttp1TransportOptions {
  httpVersion: "1.1";

  // TODO document
  nodeOptions?:
    | Omit<http.RequestOptions, "signal">
    | Omit<https.RequestOptions, "signal">;
}

export interface NodeHttp2TransportOptions {
  httpVersion: "2";

  // TODO document
  nodeOptions?: http2.ClientSessionOptions | http2.SecureClientSessionOptions;

  // TODO document
  keepSessionAlive?: boolean;
}

type CommonNodeTransportOptions = (
  | NodeHttp1TransportOptions
  | NodeHttp2TransportOptions
) & {
  baseUrl: string;
  useBinaryFormat?: boolean;
  interceptors?: Interceptor[];
  jsonOptions?: Partial<JsonReadOptions & JsonWriteOptions>;
  binaryOptions?: Partial<BinaryReadOptions & BinaryWriteOptions>;
  acceptCompression?: Compression[];
  sendCompression?: Compression;
  compressMinBytes?: number;
  readMaxBytes?: number;
  writeMaxBytes?: number;
};

export function validateNodeTransportOptions(
  options: CommonNodeTransportOptions
) {
  return {
    useBinaryFormat: options.useBinaryFormat ?? true,
    ...validateReadWriteMaxBytes(
      options.readMaxBytes,
      options.writeMaxBytes,
      options.compressMinBytes
    ),
    client:
      options.httpVersion == "2"
        ? createNodeHttp2Client(
            options.baseUrl,
            options.keepSessionAlive ?? false,
            options.nodeOptions
          )
        : createNodeHttp1Client(options.nodeOptions),
    sendCompression: options.sendCompression ?? null,
    acceptCompression: options.acceptCompression ?? [
      compressionGzip,
      compressionBrotli,
    ],
  };
}
