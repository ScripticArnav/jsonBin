import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true,
      index: true,
      sparse: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    // Allow any other fields from API
  },
  { 
    timestamps: true,
    strict: false
  }
);

const Material = mongoose.models.Material || mongoose.model("Material", materialSchema);

export default Material;

