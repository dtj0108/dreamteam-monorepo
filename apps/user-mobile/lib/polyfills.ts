// Polyfills for streaming fetch support in React Native
// Must be called before any fetch calls are made

import { polyfill as polyfillEncoding } from "react-native-polyfill-globals/src/encoding";
import { polyfill as polyfillReadableStream } from "react-native-polyfill-globals/src/readable-stream";
import { polyfill as polyfillFetch } from "react-native-polyfill-globals/src/fetch";

let isPolyfilled = false;

export function setupPolyfills() {
  if (isPolyfilled) return;

  // Order matters: ReadableStream and encoding must come before fetch
  polyfillReadableStream();
  polyfillEncoding();
  polyfillFetch();

  isPolyfilled = true;
}
