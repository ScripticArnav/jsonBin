import express from "express";
import mongoose from "mongoose";
import Material from "../models/materialsModel.js";

const router = express.Router();

function buildMaterialQueryFromParam(idParam) {
  if (mongoose.isValidObjectId(idParam)) {
    return { _id: idParam };
  }

  const num = Number(idParam);
  if (!Number.isNaN(num)) {
    return { id: num };
  }

  return null;
}

async function getNextMaterialId() {
  const lastMaterial = await Material.findOne({ id: { $ne: null } })
    .sort({ id: -1 })
    .select("id")
    .lean();

  if (!lastMaterial || lastMaterial.id == null) {
    return 1;
  }

  return lastMaterial.id + 1;
}

router.get("/", async (req, res) => {
  try {
    const materials = await Material.find().sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    console.error("GET /materials error:", err);
    res.status(500).json({ message: "Failed to fetch materials" });
  }
});

router.post("/", async (req, res) => {
  try {
    console.log("BODY:", req.body);
    const { name, description, ...rest } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ message: "name is required" });
    }

    const nextId = await getNextMaterialId();

    const material = await Material.create({
      id: nextId,
      name,
      description: description || "",
      ...rest
    });

    res.status(201).json(material);
  } catch (err) {
    console.error("POST /materials error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Material already exists or id duplicate" });
    }
    res.status(500).json({ message: "Failed to create material" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const query = buildMaterialQueryFromParam(req.params.id);
    if (!query) {
      return res.status(400).json({ message: "Invalid material id" });
    }

    const { id, _id, ...updateData } = req.body;

    const updated = await Material.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ message: "Material not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("PUT /materials/:id error:", err);
    res.status(500).json({ message: "Failed to update material" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const query = buildMaterialQueryFromParam(req.params.id);
    if (!query) {
      return res.status(400).json({ message: "Invalid material id" });
    }

    const removed = await Material.findOneAndDelete(query);
    if (!removed) {
      return res.status(404).json({ message: "Material not found" });
    }

    res.json({ message: "Material deleted", removed });
  } catch (err) {
    console.error("DELETE /materials/:id error:", err);
    res.status(500).json({ message: "Failed to delete material" });
  }
});

export default router;

