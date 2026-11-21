import { SetMetadata, type CustomDecorator } from '@nestjs/common';

import { GLOBAL_AUTH_KEY } from '../constants/request.constant';

export const GlobalAuth = (): CustomDecorator<string> =>
    SetMetadata(GLOBAL_AUTH_KEY, true);
