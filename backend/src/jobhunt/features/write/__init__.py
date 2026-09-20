"""Cover-letter writer: sealed packet in, Gemini letter out.

Purpose: Public API for the write feature used by the CLI.
Inputs: Imported by ``jobhunt.cli`` and ``backend/tests``.
Returns: ``write_letters``, ``build_packet``.
Does not: Submit applications or include more than one job in a packet.
"""

from jobhunt.features.write.letters import build_packet, regenerate_letter_for_job, write_letters

__all__ = ["build_packet", "regenerate_letter_for_job", "write_letters"]
