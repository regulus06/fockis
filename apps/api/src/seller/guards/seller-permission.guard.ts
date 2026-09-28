import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";


@Injectable()
export class SellerPermissionGuard implements CanActivate {


  constructor(
    private requiredPermission?: string
  ) {}



  canActivate(
    context: ExecutionContext
  ): boolean {


    const request =
      context.switchToHttp().getRequest();



    const user =
      request.user;



    if(!user){

      throw new ForbiddenException(
        "Authentication required"
      );

    }




    const seller =
      user.sellerProfile;



    if(!seller){

      throw new ForbiddenException(
        "Seller profile required"
      );

    }




    if(
      !seller.active
    ){

      throw new ForbiddenException(
        "Seller account disabled"
      );

    }




    if(
      this.requiredPermission &&
      !seller.permissions.includes(
        this.requiredPermission
      )
    ){

      throw new ForbiddenException(
        "Missing seller permission"
      );

    }



    return true;

  }

}