import { Injectable } from "@nestjs/common";
import { v4 as uuid } from "uuid";

@Injectable()
export class RealEstateUploadService {
  uploadFiles(files: Express.Multer.File[]) {
    return files.map((file) => ({
      id: uuid(),
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
    }));
  }
}