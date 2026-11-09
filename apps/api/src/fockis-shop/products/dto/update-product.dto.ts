
import { PartialType } from "@nestjs/mapped-types";
import { CreateProductDto } from "./create-product.dto";

/**
 * Update Product DTO
 *
 * All fields from CreateProductDto become optional,
 * including brandOwnership, productSource, supplierName,
 * sourcingDetails, and fulfillmentDetails.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
