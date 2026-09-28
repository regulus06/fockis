import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Student extends Document {
  // Stable, human-readable id (e.g. "demo-student") so the no-login
  // prototype frontend can keep calling getStudentCourses('demo-student')
  // unchanged. Once you add real student auth, look students up by their
  // authenticated user's Mongo _id instead and this field becomes optional.
  @Prop({ unique: true, sparse: true })
  slug?: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  email?: string;

  @Prop({ default: 0 })
  gpa: number;

  @Prop({ default: 0 })
  creditsCompleted: number;

  @Prop({ default: 0 })
  attendancePct: number;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
