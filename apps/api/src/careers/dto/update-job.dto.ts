
import { PartialType } from "@nestjs/mapped-types";
import { CreateJobDto } from "./create-job.dto";

/**
 * UPDATE JOB DTO
 *
 * Reuses CreateJobDto validation while making
 * every property optional for partial updates.
 */
export class UpdateJobDto extends PartialType(
  CreateJobDto,
) {}
