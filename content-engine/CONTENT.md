*CONTENT GENERATION SYSTEM
The social media network is compound by several peoples with different paradigms, students, research, people like humor and jokes, tech people with IT knowladge, employes and more

KEYPOINTS:
Using cloud providers to this is very expensive despite that quality would be great
We rely on local inference engines to massive generate more content up to 1.8GB at reates of 240 tg/s it willtake severals hours
Once create should pullable for registry like hugging face, big seed is not meant to be commitable in this repo

STAGES:
-- The seed involve a throughtful simulation, synthetic users(SU) create profiles, posts(random posts from their personality: prompt system described)
-- Phase two, then started to creating comment or responsing to another comments
-- then create pages and groups base on interests

PARADIGMS:
Tech, Biology, Ecologic, Coding, AutoIndustry, Hummors, Movies, Entertaiment, Musics, History and Art.
We tollaly skip real controvercy topics to generate, fully skipped.

PERSONALITIES:
We should create optimistic/possitive personalities affinities, some of them maybe sharpy or more serious, but never toxic, negative or offensive.
We create take templates and create deep backstory generate by the LLM

PROCESS:
We start create a head.job.json with personalities templates and snapshort of users, we store temporal tokens to hit backend in another file by user id.
We create progressive batch and jump to new one when which reach an umbral.
We commit to hugging face three main assets: head.jobs, content-xx1.json, and traces-xx1.json
Traces should contains final chat json format for debbuging and research purpose

CHALLENGE:
To prevent too much allucation in nearest post or commnent we should batch jobs with post to comment together, not long cross generation of comments

IRON_RULES:
We never should introduce politics, religion or problematic moral debates, content should engager but not at that cost, also this for development purpose, we are not researching synthetic world stuff or nothing close 
