import { OpenAPIHono } from '@hono/zod-openapi';
import {
  listLedgerController,
  createLedgerController,
  deleteLedgerController,
} from '../controllers/ledger.controller';
import type { AppEnv } from '../types';

export const ledgerRouter = new OpenAPIHono<AppEnv>();

ledgerRouter.get('/', listLedgerController);
ledgerRouter.post('/', createLedgerController);
ledgerRouter.delete('/:id', deleteLedgerController);
