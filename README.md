# react-native-audio-form-fill

On-device speech-to-form filling for React Native. Records speech, transcribes it with Whisper, and fills
JSON Schema form fields with a small local language model whose output is constrained to the schema. Runs
offline after a one-time model download.

## Install

```sh
yarn add @earthranger/react-native-audio-form-fill
```

## What's in this release

Pure TypeScript with no native dependencies:

| Export | Purpose |
|---|---|
| `getDictationFields(jsonSchema)` | Lists the top-level fields a model can fill (text, number, integer, boolean, date/time, single and multi choice) and the ones it skips (objects such as locations, collections, attachments, deprecated/hidden fields, choice lists over `MAX_DICTATION_CHOICE_OPTIONS`). |
| `buildExtractionSchema(fields)` | JSON Schema for the model's output, for grammar-constrained decoding (e.g. llama.cpp `response_format`). Choice fields are limited to their option titles. |
| `buildExtractionMessages(fields, transcript, currentValues, now)` | System and user chat messages for the extraction prompt. |
| `parseExtractionOutput(text)` | Parses the model's JSON reply, tolerating code fences or leading text. |
| `coerceExtractedValues(fields, extracted)` | Maps choice titles back to stored values and enforces min/max, pattern, max length and date formats. Returns `values` to merge into the form and `rejected` values with a reason. |

Choice options are read from v1 `enum` + `enumNames` (array or index-keyed object) and from v2 `oneOf` /
`anyOf: [{ oneOf }]` `{ const, title }` lists, as produced by
[`@earthranger/react-native-jsonforms-formatter`](https://github.com/PADAS/react-native-jsonforms-formatter).

```ts
import {
  buildExtractionMessages,
  buildExtractionSchema,
  coerceExtractedValues,
  getDictationFields,
  parseExtractionOutput,
} from '@earthranger/react-native-audio-form-fill';

const { fields } = getDictationFields(jsonSchema);
const messages = buildExtractionMessages(fields, transcript, formData, new Date());
const schema = buildExtractionSchema(fields);

// Run any chat model with `messages`, constraining its output to `schema`, then:
const { values, rejected } = coerceExtractedValues(fields, parseExtractionOutput(modelOutput));
```

## Development

```sh
npm install      # also points git hooks at .githooks (lint on commit)
npm run lint
npm run typecheck
npm test
npm run build    # compiles src/ to dist/ (CommonJS + type declarations)
```

Metro resolves the TypeScript source through the `react-native` field in `package.json`; Node and Jest use
`dist/`.

## License

Apache-2.0
