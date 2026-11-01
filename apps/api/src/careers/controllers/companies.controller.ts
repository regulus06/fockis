import { Controller, Get, Param, Query } from "@nestjs/common";

import { EmployerService } from "../services/employer.service";

/**
 * PUBLIC COMPANY PAGES (Fockis Careers)
 *
 * GET /careers/companies            companies with open jobs
 * GET /careers/companies/:id        company profile + open jobs
 *
 * :id is the employer account id (the jobs' employerId), which is
 * what job listings already expose as the company id.
 */
@Controller("careers/companies")
export class CompaniesController {
  constructor(private readonly employers: EmployerService) {}

  @Get()
  list(@Query("search") search?: string) {
    return this.employers.listPublicCompanies(search);
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.employers.getPublicCompany(id);
  }

  @Get(":id/jobs")
  jobs(@Param("id") id: string) {
    return this.employers.getPublicCompany(id).then((company) => company.jobs);
  }
}
