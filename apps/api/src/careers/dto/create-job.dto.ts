
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

/**
 * CREATE JOB DTO
 *
 * Used when an employer creates a new job listing.
 */
export class CreateJobDto {
  /**
   * JOB INFORMATION
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(150)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  company!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  companyDescription?: string;

  @IsOptional()
  @IsUrl(
    {
      require_protocol: true,
    },
    {
      message: "Company website must be a valid URL",
    },
  )
  @MaxLength(2048)
  companyWebsite?: string;

  /**
   * INTERNATIONAL LOCATION
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  stateProvince?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  /**
   * JOB TYPE
   *
   * job | internship | coop
   */
  @IsString()
  @IsNotEmpty()
  @IsIn(
    ["job", "internship", "coop"],
    {
      message:
        "Job type must be job, internship, or coop",
    },
  )
  type!: string;

  /**
   * WORKPLACE TYPE
   *
   * remote | hybrid | onsite
   */
  @IsOptional()
  @IsString()
  @IsIn(
    ["remote", "hybrid", "onsite"],
    {
      message:
        "Workplace type must be remote, hybrid, or onsite",
    },
  )
  workplaceType?: string;

  /**
   * JOB DESCRIPTION
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(20000)
  description!: string;

  /**
   * COMPENSATION
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  salary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @IsIn(
    [
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "negotiable",
    ],
    {
      message: "Invalid salary period",
    },
  )
  salaryPeriod?: string;

  /**
   * REMOTE WORK
   */
  @IsOptional()
  @IsBoolean()
  remote?: boolean;

  /**
   * APPLICATION DEADLINE
   */
  @IsOptional()
  @IsDateString(
    {},
    {
      message:
        "Application deadline must be a valid ISO date",
    },
  )
  applicationDeadline?: string;

  /**
   * REQUIRED SKILLS
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  skills?: string[];

  /**
   * JOB BENEFITS
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  benefits?: string[];

  /**
   * NUMERIC SALARY RANGE
   *
   * Optional structured range. The legacy "salary" string is
   * still accepted for backward compatibility.
   */
  @IsOptional()
  @IsNumber({}, { message: "Minimum salary must be a number" })
  @Min(0)
  salaryMin?: number;

  @IsOptional()
  @IsNumber({}, { message: "Maximum salary must be a number" })
  @Min(0)
  salaryMax?: number;

  /**
   * APPLICATION METHOD
   *
   * fockis   -> existing internal Fockis application flow
   * external -> candidates are sent to applicationUrl
   */
  @IsOptional()
  @IsIn(["fockis", "external"], {
    message: "Application method must be fockis or external",
  })
  applicationMethod?: "fockis" | "external";

  @ValidateIf(
    (dto: CreateJobDto) => dto.applicationMethod === "external",
  )
  @IsString()
  @IsNotEmpty({
    message:
      "An external application URL is required when applying on the company website",
  })
  @IsUrl(
    {
      require_protocol: true,
      protocols: ["http", "https"],
    },
    {
      message:
        "External application URL must be a valid http(s) URL",
    },
  )
  @MaxLength(2048)
  applicationUrl?: string;

  @IsOptional()
  @IsIn(["full_time", "part_time", "contract", "temporary"], {
    message: "Employment type must be full_time, part_time, contract or temporary",
  })
  employmentType?: "full_time" | "part_time" | "contract" | "temporary";

  @IsOptional()
  @IsIn(["entry", "mid", "senior"], {
    message: "Experience level must be entry, mid or senior",
  })
  experienceLevel?: "entry" | "mid" | "senior";
}
