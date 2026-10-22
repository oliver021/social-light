using Asp.Versioning;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using SocialLight.MPEG.Service.Apis;
using SocialLight.MPEG.Service.GrpcImpl;
using SocialLight.MPEG.Service.Extensions;
using SocialLight.MPEG.Service.Services;
using SocialLight.ServiceDefaults;
using Hangfire;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddApplicationServices();
builder.Services.AddProblemDetails();
builder.Services.AddGrpc();

var withApiVersioning = builder.Services.AddApiVersioning(options =>
{
    options.ReportApiVersions = true;
});

builder.AddDefaultOpenApi(withApiVersioning);

var app = builder.Build();

app.MapDefaultEndpoints();
app.UseStatusCodePages();

app.MapVideoEndpoints();
app.MapImageEndpoints();
app.MapMediaEndpoints();
app.MapGrpcService<MediaProcessingService>();

// Serve stored blobs (avatars, post photos) at /blobs/{name} from the same root
// the IBlobStore writes to, so media seeded via POST /api/v1/media is reachable.
var blobStore = app.Services.GetRequiredService<IBlobStore>();
var blobContentTypes = new FileExtensionContentTypeProvider();
blobContentTypes.Mappings[".webp"] = "image/webp";
blobContentTypes.Mappings[".svg"] = "image/svg+xml";
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(blobStore.Root),
    RequestPath = FileSystemBlobStore.RequestPath,
    ContentTypeProvider = blobContentTypes,
});

app.UseHangfireDashboard("/hangfire");

app.UseDefaultOpenApi();

app.Run();
