import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { AuditsService } from './audits.service';

@ApiTags('Public')
@Controller('public')
export class PublicAuditsController {
  constructor(private readonly audits: AuditsService) {}

  @Public()
  @Get('reports/:shareToken')
  @ApiOperation({ summary: 'Read-only shared audit report (no auth)' })
  getShared(@Param('shareToken') shareToken: string) {
    return this.audits.getPublicByShareToken(shareToken);
  }
}
