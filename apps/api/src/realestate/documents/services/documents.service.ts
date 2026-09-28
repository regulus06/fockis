import {
 Injectable,
 NotFoundException,
} from '@nestjs/common';


import {
 InjectModel,
} from '@nestjs/mongoose';


import {
 Model,
} from 'mongoose';


import {
 Document,
 DocumentDocument,
} from '../schemas/document.schema';


import {
 CreateDocumentDto,
} from '../dto/create-document.dto';


import {
 UpdateDocumentDto,
} from '../dto/update-document.dto';



@Injectable()
export class DocumentsService {


constructor(

@InjectModel(Document.name)

private readonly documentModel:
Model<DocumentDocument>

){}



async create(
dto:CreateDocumentDto
){

const doc =
new this.documentModel(dto);


return doc.save();

}




async findAll(){

return this.documentModel
.find()
.populate('property')
.populate('tenant')
.populate('landlord')
.exec();

}




async findOne(id:string){

const doc =
await this.documentModel.findById(id);


if(!doc){

throw new NotFoundException(
'Document not found'
);

}


return doc;

}




async findByProperty(
propertyId:string
){

return this.documentModel.find({
property:propertyId
});

}




async update(
id:string,
dto:UpdateDocumentDto
){

return this.documentModel
.findByIdAndUpdate(
id,
dto,
{
new:true
}
);

}




async verify(
id:string,
status:string
){

return this.documentModel
.findByIdAndUpdate(
id,
{
verificationStatus:status
},
{
new:true
}
);

}




async remove(id:string){

return this.documentModel
.findByIdAndDelete(id);

}


}