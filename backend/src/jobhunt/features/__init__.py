"""Engine features: scout, match, write, vault, runlog.

Purpose: House one-concern packages so new work lands in a feature folder.
Inputs: None (namespace package marker).
Returns: None.
Does not: Import every feature at startup (callers import the folder they need).
"""
