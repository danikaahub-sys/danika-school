import { SetMetadata, type CustomDecorator } from '@nestjs/common';

import { PERMISSION_KEY } from 'src/common/request/constants/request.constant';

import type { PermissionKey } from './permission.catalog';

export const RequirePermission = (
    key: PermissionKey
): CustomDecorator<string> => SetMetadata(PERMISSION_KEY, key);
