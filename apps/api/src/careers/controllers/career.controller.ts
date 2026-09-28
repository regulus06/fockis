import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";

import {
  CareerService,
} from "../services/career.service";

import {
  CreateJobDto,
} from "../dto/create-job.dto";

import {
  UpdateJobDto,
} from "../dto/update-job.dto";

@Controller("careers")
export class CareerController {
  constructor(
    private readonly careerService:
      CareerService,
  ) {}

  /*
   * PUBLIC JOB SEARCH
   *
   * GET /careers
   */
  @Get()
  findAll(
    @Query("search") search?: string,
    @Query("country") country?: string,
    @Query("city") city?: string,
    @Query("type") type?: string,
    @Query("workplaceType")
    workplaceType?: string,
    @Query("remote") remote?: string,
  ) {
    return this.careerService.findAll({
      search,
      country,
      city,
      type,
      workplaceType,
      remote:
        remote === undefined
          ? undefined
          : remote === "true",
    });
  }

  /*
   * EMPLOYER'S JOBS
   *
   * GET /careers/my-jobs
   */
  @Get("my-jobs")
  findMine(
    @Req() req: any,
  ) {
    return this.careerService.findMine(
      req.user.id,
    );
  }

  /*
   * GET /careers/:id
   */
  @Get(":id")
  findOne(
    @Param("id") id: string,
  ) {
    return this.careerService.findOne(id);
  }

  /*
   * CREATE JOB
   *
   * POST /careers
   *
   * The employer is taken from JWT.
   */
  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateJobDto,
  ) {
    return this.careerService.create(
      req.user.id,
      dto,
    );
  }

  /*
   * UPDATE OWN JOB
   */
  @Patch(":id")
  update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.careerService.update(
      id,
      req.user.id,
      dto,
    );
  }

  /*
   * DELETE OWN JOB
   */
  @Delete(":id")
  remove(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.careerService.remove(
      id,
      req.user.id,
    );
  }
}