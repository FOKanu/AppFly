"""Compatibility shim. Canonical package: jobhunt.features.write.

Purpose: Keep `from jobhunt.write import write_letters, build_packet` working.
Inputs: None (re-export).
Returns: write_letters, build_packet, WRITER_SYSTEM.
Does not: Call Gemini (edit features/write).
"""

from jobhunt.features.write import WRITER_SYSTEM, build_packet, write_letters

__all__ = ["WRITER_SYSTEM", "build_packet", "write_letters"]
