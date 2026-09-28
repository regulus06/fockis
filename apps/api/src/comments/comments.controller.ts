import { Controller, Get, Post, Body, Param, Delete, Patch } from '@nestjs/common';
import { CommentsService } from './comments.service';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(@Body() body: any) {
    return this.commentsService.createComment(body);
  }

  @Get(':targetId')
  getComments(@Param('targetId') targetId: string) {
    return this.commentsService.getComments(targetId);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.commentsService.deleteComment(id);
  }

  @Patch(':id/like')
  like(@Param('id') id: string) {
    return this.commentsService.likeComment(id);
  }
}