import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateDocument, CreateDocumentDocument, DocumentStatus } from '../schemas/create-document.schema';
import { Scan, ScanDocument } from '../schemas/create-scan.schema';

@ApiTags('create-workspace')
@ApiBearerAuth()
@Controller('create/workspace')
export class CreateWorkspaceController {
  constructor(
    @InjectModel(CreateDocument.name) private readonly documentModel: Model<CreateDocumentDocument>,
    @InjectModel(Scan.name) private readonly scanModel: Model<ScanDocument>,
  ) {}

  @Get()
  async summary(@CurrentUser('userId') userId: string) {
    const uid = new Types.ObjectId(userId);

    const [draft, inProgress, completed, archived, favorites, scans] = await Promise.all([
      this.documentModel.countDocuments({ userId: uid, status: DocumentStatus.DRAFT }),
      this.documentModel.countDocuments({ userId: uid, status: DocumentStatus.IN_PROGRESS }),
      this.documentModel.countDocuments({ userId: uid, status: DocumentStatus.COMPLETED }),
      this.documentModel.countDocuments({ userId: uid, status: DocumentStatus.ARCHIVED }),
      this.documentModel.countDocuments({ userId: uid, isFavorite: true }),
      this.scanModel.countDocuments({ userId: uid }),
    ]);

    return {
      documents: { draft, inProgress, completed, archived, total: draft + inProgress + completed + archived },
      favorites,
      scans,
    };
  }
}
