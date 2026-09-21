import { HttpServerResponse } from '@effect/platform'
import { StatusCodes } from 'http-status-codes'

export const created = HttpServerResponse.json(
  {
    message: 'Email sent',
  },
  { status: StatusCodes.CREATED }
)

export const serverError = HttpServerResponse.json(
  {
    message: 'Something went wrong sending the email',
  },
  { status: StatusCodes.INTERNAL_SERVER_ERROR }
)

export const parseError = HttpServerResponse.json(
  {
    message: 'Something went wrong decoding the submission',
  },
  { status: StatusCodes.INTERNAL_SERVER_ERROR }
)
