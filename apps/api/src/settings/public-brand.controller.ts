import { Controller, Get, Param, Res, Headers } from "@nestjs/common";
import { PublicBrandService } from "./public-brand.service";

@Controller("public")
export class PublicBrandController {
  constructor(private readonly service: PublicBrandService) {}
  @Get("branding/login")
  async login(@Res() res: any) {
    return res
      .header("Cache-Control", "no-store")
      .send(await this.service.login());
  }
  @Get("brand-assets/:id/:hash.png")
  image(
    @Param("id") id: string,
    @Param("hash") hash: string,
    @Headers("if-none-match") etag: string,
    @Res() res: any,
  ) {
    return this.service.serve(id, hash, res, etag);
  }
}
