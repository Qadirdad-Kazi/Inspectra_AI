import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class PaginatedResponseDto<T> {
  data!: T[];
  meta!: PaginationMetaDto;
}

export function ApiPaginatedOkResponse<TModel extends Type<unknown>>(model: TModel) {
  return applyDecorators(
    ApiExtraModels(model, PaginationMetaDto),
    ApiOkResponse({
      schema: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: getSchemaPath(model) } },
          meta: { $ref: getSchemaPath(PaginationMetaDto) },
        },
      },
    }),
  );
}
