// dynamic-model-loader.js
import mongoose from "mongoose";
import axios from "axios";

const CONFIG_URL =
  process.env.REMOTE_CONFIG_URL ||
  "https://api.jsonbin.io/v3/b/693a9bbad0ea881f4021b07d";

let models = {};

/**
 * Ensure mongoose is connected. If not connected, attempt to connect using
 * process.env.MONGO_URI. Throws an error if there's no URI or the connection fails.
 */
async function ensureConnected() {
  const ready = mongoose.connection.readyState; // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (ready === 1) return; // already connected

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error(
      "MONGO_URI is not set. Set process.env.MONGO_URI or connect mongoose before calling loadModels()."
    );
  }

  console.log("⏳ Mongoose not connected — attempting to connect...");
  try {
    // mongoose v6+ doesn't require these options, but harmless to include
    await mongoose.connect(uri, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      // serverSelectionTimeoutMS: 5000
    });
    console.log("🔌 Mongoose connected.");
  } catch (err) {
    console.error("❌ Mongoose connection failed:", err.message);
    throw err;
  }
}

/**
 * Resolve simple type names from config to mongoose types.
 */
function resolveType(typeName) {
  const types = {
    string: String,
    number: Number,
    boolean: Boolean,
    date: Date,
    objectid: mongoose.Schema.Types.ObjectId,
    array: Array,
    mixed: mongoose.Schema.Types.Mixed,
    // add others if needed: buffer, decimal128, map, etc.
  };
  return types[typeName?.toLowerCase()] || mongoose.Schema.Types.Mixed;
}

/**
 * Convert a config field definition into a mongoose-compatible definition.
 * Handles:
 *  - simple string types: "string" -> { type: String }
 *  - arrays: ["string"] -> [{ type: String }]
 *  - objects with `type` key: { type: "string", required: true }
 *  - plain nested objects (sub-doc schemas)
 */
function convertField(def) {
  if (Array.isArray(def)) return [convertField(def[0])];

  if (typeof def === "string") return { type: resolveType(def) };

  if (typeof def === "object") {
    if (def.type) {
      const { type, ...rest } = def;

      // If `type` itself is a plain object, treat it as nested schema
      if (typeof type === "object" && !Array.isArray(type)) {
        return buildSchemaFields(type);
      }

      return { type: resolveType(type), ...rest };
    }

    // Plain object without `type` -> nested sub-document schema
    return buildSchemaFields(def);
  }

  return def;
}

function buildSchemaFields(fields) {
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = convertField(value);
  }
  return result;
}

/**
 * Create or reuse an existing model to avoid OverwriteModelError.
 * If the model already exists, we return the existing one and log a warning.
 */
function createOrGetModel(name, schema) {
  if (mongoose.models[name]) {
    // Model already exists (likely from a previous load); reuse it.
    console.warn(`⚠️ Model "${name}" already exists. Reusing existing model.`);
    return mongoose.model(name);
  }

  return mongoose.model(name, schema);
}

/**
 * Main loader: fetches config, builds schemas, and registers models.
 * It will ensure a mongoose connection exists (tries to connect using MONGO_URI if needed).
 */
async function loadModels({ autoConnect = true } = {}) {
  try {
    console.log("🌍 Loading models from JSONBin...");

    if (autoConnect) {
      await ensureConnected();
    } else if (mongoose.connection.readyState !== 1) {
      throw new Error(
        "Mongoose not connected. Set autoConnect=true or connect mongoose before calling loadModels()."
      );
    }

    const res = await axios.get(CONFIG_URL);
    const config = res.data?.record || res.data;

    if (!config || typeof config !== "object") {
      throw new Error("Invalid remote config — expected an object of model configs.");
    }

    for (const [modelName, modelConfig] of Object.entries(config)) {
      if (modelName === "metadata" || !modelConfig?.schema) continue;

      const schemaFields = buildSchemaFields(modelConfig.schema || {});
      const schemaOptions = { timestamps: true, ...modelConfig.options };
      const mongooseSchema = new mongoose.Schema(schemaFields, schemaOptions);

      // Use createOrGetModel to avoid OverwriteModelError
      models[modelName] = createOrGetModel(modelName, mongooseSchema);
      console.log(`✅ Model created/loaded: ${modelName}`);
    }

    console.log("✨ All models loaded successfully");
    return models;
  } catch (err) {
    console.error("❌ Failed to load models:", err?.message || err);
    return models;
  }
}

export default loadModels;
export { models };