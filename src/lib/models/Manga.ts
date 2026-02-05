import mongoose, { Schema, Document } from 'mongoose';

export interface IManga extends Document {
  mangaId: string;
  title: string;
  description?: string;
  status?: string;
  year?: number;
  tags?: string[];
  coverUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MangaSchema: Schema = new Schema({
  mangaId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String },
  year: { type: Number },
  tags: [{ type: String }],
  coverUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Manga || mongoose.model<IManga>('Manga', MangaSchema);
