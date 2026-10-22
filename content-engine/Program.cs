using SocialLight.ContentEngine.Cli;

// content-engine — synthetic-content host for socialLight (dev only).
// Stage 1 (now): `seed create` authors a committable, normalized seed via local
// LLM inference. Stage 2: `seed push` replays that seed against the social API.
return await CommandRouter.RunAsync(args);
