"""Write-only secret DTOs.

Purpose: PUT/DELETE bodies for ``/settings/secrets/{name}``.
Inputs: Connector name in the path; PUT value in JSON.
Returns: ``configured`` booleans only.
Does not: Include plaintext, last-4 digits, or a GET-of-secret schema.
"""

from pydantic import BaseModel, ConfigDict, Field


class SecretWriteRequest(BaseModel):
    """PUT body for ``/settings/secrets/{name}``.

    Purpose: accept the new key once. Rotate = send a new value.
    Inputs: ``value`` from Settings.
    Returns: Validated non-empty string after strip is checked in the store.
    Does not: include last-4 or a read-back field.
    """

    model_config = ConfigDict(extra="forbid")

    value: str = Field(..., min_length=1)


class SecretWriteResult(BaseModel):
    """PUT/DELETE result.

    Purpose: tell the UI whether a key is now present.
    Inputs: Built after a successful save or delete.
    Returns: ``configured`` only.
    Does not: echo the secret.
    """

    model_config = ConfigDict(extra="forbid")

    configured: bool
