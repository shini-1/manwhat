import mongoose, { Schema, Document } from 'mongoose';

export interface ISource extends Document {
  name: string;
  url: string;
  scraper: string; // e.g., 'asurascans'
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SourceSchema: Schema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  scraper: { type: String, required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Source || mongoose.model<ISource>('Source', SourceSchema);
