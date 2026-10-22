using SocialLight.Basket.API.Apis;

var builder = WebApplication.CreateBuilder(args);

builder.AddBasicServiceDefaults();
builder.AddApplicationServices();

builder.Services.AddGrpc();
builder.Services.AddProblemDetails();

var withApiVersioning = builder.Services.AddApiVersioning();
builder.AddDefaultOpenApi(withApiVersioning);

var app = builder.Build();

app.MapDefaultEndpoints();

// Two transports over one repository: gRPC for native/checkout callers, REST for
// browsers (so the Marketplace cart needs no gRPC-web tooling). The endpoint accepts
// Http1AndHttp2 (see appsettings) so both share the same port.
app.MapGrpcService<BasketService>();

var basket = app.NewVersionedApi("Basket");
basket.MapBasketApiV1();

app.UseDefaultOpenApi();

app.Run();
