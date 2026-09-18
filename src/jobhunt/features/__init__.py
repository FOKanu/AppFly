"""Feature packages that wrap the existing engine without reimplementing it.

Purpose: Group higher-level flows (pipeline, later secrets) next to scout/match/write.
Inputs: None; import submodules such as ``jobhunt.features.pipeline``.
Returns: Package namespace only.
Does not: Fetch job listings or talk to Gemini.
"""
