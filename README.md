# react-native-audio-form-fill

On-device speech-to-form filling for React Native. Records speech, transcribes it with Whisper, and fills
JSON Schema form fields with a small local language model whose output is constrained to the schema. Runs
offline after a one-time model download.

## Install

```sh
yarn add @earthranger/react-native-audio-form-fill react-native-fs react-native-audio-api@^0.13.0 \
  whisper.rn@^0.7.4 llama.rn@^0.12.9
cd ios && pod install
```

Peer dependencies: `react-native-fs` downloads and stores models, `react-native-audio-api` records speech,
`whisper.rn` (whisper.cpp) transcribes it and `llama.rn` (llama.cpp) fills the form. The React Native New
Architecture is required by both native model libraries.

Recording needs microphone permission: `NSMicrophoneUsageDescription` in the iOS `Info.plist`, and
`android.permission.RECORD_AUDIO` in the Android manifest. The hook asks for permission the first time it records.

### whisper.rn 0.7.4 patch

whisper.rn 0.7.4 needs a patch until it is fixed upstream. Copy
[`docs/patches/whisper.rn+0.7.4.patch`](docs/patches/whisper.rn+0.7.4.patch) into your app's `patches/` folder
and apply it with [patch-package](https://github.com/ds300/patch-package). It fixes two problems:

- Its `package.json` `exports` map has no `"."` or `"./package.json"` entry, so React Native codegen silently
  skips the library (iOS fails with `RNWhisperSpec/RNWhisperSpec.h` not found) and Jest/Node cannot resolve it.
- Its podspec copies headers from every slice of the prebuilt xcframework, which collide under
  `use_frameworks! :linkage => :static` ("Multiple commands produce …/Headers/*.h").

## Extraction

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

## Models

| Export | Purpose |
|---|---|
| `LOCAL_MODELS` | Built-in registry: Whisper base and small (speech), Qwen2.5 1.5B Instruct and Qwen3 1.7B (form filling), downloaded from Hugging Face. |
| `getModelsForType(type, models?)` | Models of type `'speech'` or `'language'`. Pass your own list to use different models. |
| `getModelForType(type, id, models?)` | The model with a saved id, falling back to the first model of that type. |
| `downloadModel(model, onProgress)` | Downloads to `<Documents>/local-ai-models`. Writes to a `.partial` file and only moves it into place after a 200 response, so an interrupted download never looks complete. |
| `isModelDownloaded(model)`, `getModelPath(model)`, `deleteModel(model)` | Locate and remove downloaded files. |

```ts
import { downloadModel, getModelForType, isModelDownloaded } from '@earthranger/react-native-audio-form-fill';

const speechModel = getModelForType('speech', savedSpeechModelId);
if (!(await isModelDownloaded(speechModel))) {
  await downloadModel(speechModel, (fraction) => setProgress(fraction));
}
```

## Engine

| Export | Purpose |
|---|---|
| `transcribeAudio(model, audioPath, shouldTranslateToEnglish)` | Transcribes a WAV file with Whisper (language auto-detected; optionally translated to English). Returns the trimmed `transcript`, detected `language` and timings. |
| `extractFormValues(model, fields, transcript, currentValues)` | Fills `fields` from the transcript with a llama.cpp model whose output is constrained to `buildExtractionSchema(fields)`, then checks it with `coerceExtractedValues`. Returns `values`, `rejected`, the model's `rawOutput`, and load, generation and token timings. |
| `releaseDictationModels()` | Frees the loaded models. |

One speech model and one language model stay loaded between calls, because loading a 1 GB model takes several
seconds; selecting a different model releases the previous one. The language model runs with every layer offloaded
to the GPU (Metal on iOS) where llama.cpp supports it, and on the CPU otherwise.

```ts
import { extractFormValues, getDictationFields, transcribeAudio } from '@earthranger/react-native-audio-form-fill';

const { transcript } = await transcribeAudio(speechModel, wavPath, true);
const { values, rejected } = await extractFormValues(languageModel, getDictationFields(jsonSchema).fields,
  transcript, formData);
```

## Dictation hook

`useFormDictation(options)` drives a dictation button: one tap starts recording, the next stops it, transcribes,
fills the form and calls `onFilled` with the checked values. It records a 16 kHz mono WAV file and deletes it
afterwards.

| Option | |
|---|---|
| `jsonSchema` | The form's JSON Schema, as passed to the form renderer. |
| `currentValues` | The form's current data, sent to the model as context. Read when dictation finishes, so values typed meanwhile are included. |
| `onFilled(values)` | Called when at least one field was filled. Merge `values` into the form data. |
| `speechModel`, `languageModel` | Downloaded models to use (see [Models](#models)). |
| `shouldTranslateToEnglish` | Translate speech to English before filling, for forms whose options are in English. |
| `logger` | Optional `{ debug, info, warn, error }`. Receives status changes, the field summary, transcript, filled and rejected values, the raw model output and a metrics line. |
| `getUsedMemory` | Optional `() => Promise<bytes>` (e.g. `DeviceInfo.getUsedMemory`), added to the metrics line. |

Returns `status` (`'idle' | 'recording' | 'transcribing' | 'extracting'`), `fieldCount` (hide the button when it's
0) and `toggleRecording`.

```tsx
const { status, fieldCount, toggleRecording } = useFormDictation({
  jsonSchema,
  currentValues: formData,
  onFilled: (values) => setFormData((data) => ({ ...data, ...values })),
  speechModel,
  languageModel,
  shouldTranslateToEnglish: true,
  logger: console,
});
```

## Model settings hook

`useLocalModels({ storage, models?, logger? })` manages which speech and form fill models are selected, whether
speech is translated to English (default on), and model downloads. Selections are saved through an
`AudioFormFillStorage` you provide, under `AUDIO_FORM_FILL_STORAGE_KEYS`.

```ts
interface AudioFormFillStorage {
  getString: (key: string) => string | undefined;
  getBoolean: (key: string) => boolean | undefined;
  set: (key: string, value: string | boolean) => void;
  // Optional: report changes so every screen using the hook stays in sync. Returns an unsubscribe function.
  subscribe?: (onChange: (key: string) => void) => () => void;
}
```

Create the storage once (e.g. at module level), not inside a component. With MMKV:

```ts
import { MMKV } from 'react-native-mmkv';
import { AudioFormFillStorage, useLocalModels } from '@earthranger/react-native-audio-form-fill';

const mmkv = new MMKV();

export const audioFormFillStorage: AudioFormFillStorage = {
  getString: (key) => mmkv.getString(key),
  getBoolean: (key) => mmkv.getBoolean(key),
  set: (key, value) => mmkv.set(key, value),
  subscribe: (onChange) => {
    const listener = mmkv.addOnValueChangedListener(onChange);
    return () => listener.remove();
  },
};

const {
  speechModel, languageModel, areModelsReady, shouldTranslateToEnglish,
  speechModels, languageModels, downloadedModelIds, downloadProgress, downloadError,
  onSelectModel, onDownloadModel, setShouldTranslateToEnglish, refreshDownloadedModels,
} = useLocalModels({ storage: audioFormFillStorage });
```

Downloaded models are checked when the hook mounts. Call `refreshDownloadedModels` when a screen regains focus
(e.g. from React Navigation's `useFocusEffect`) to pick up downloads made on another screen.

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
