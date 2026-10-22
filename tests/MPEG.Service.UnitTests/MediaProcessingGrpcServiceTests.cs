using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using NSubstitute;
using SocialLight.MPEG.Service.Grpc;
using SocialLight.MPEG.Service.GrpcImpl;
using SocialLight.MPEG.Service.Models;
using SocialLight.MPEG.Service.Services;
using GrpcVideoFormat = SocialLight.MPEG.Service.Grpc.VideoFormat;
using GrpcImageFormat = SocialLight.MPEG.Service.Grpc.ImageFormat;
using GrpcJobStatus = SocialLight.MPEG.Service.Grpc.JobStatus;
using ModelsJobStatus = SocialLight.MPEG.Service.Models.JobStatus;

namespace SocialLight.MPEG.Service.UnitTests;

[TestClass]
public class MediaProcessingGrpcServiceTests
{
    [TestMethod]
    public async Task ConvertVideo_EnqueuesJobAndReturnsJobId()
    {
        var mockJobClient = Substitute.For<IBackgroundJobClient>();
        var mockResultStore = Substitute.For<IJobResultStore>();
        var service = new MediaProcessingService(mockJobClient, mockResultStore);

        var request = new ConvertVideoRequest
        {
            FileData = Google.Protobuf.ByteString.CopyFrom([1, 2, 3]),
            TargetFormat = GrpcVideoFormat.Mp4,
            QualityPreset = VideoQualityPreset.VideoQualityMedium,
            CallbackAddress = "http://localhost:5001"
        };

        var response = await service.ConvertVideo(request, null!);

        Assert.IsNotNull(response);
        Assert.IsFalse(string.IsNullOrEmpty(response.JobId));

        mockResultStore.Received(1).Set(response.JobId, Arg.Is<JobResult>(r => r.JobId == response.JobId && r.Status == ModelsJobStatus.Queued));
        mockJobClient.Received(1).Create(
            Arg.Is<Job>(job => job.Method.Name == nameof(MediaJobExecutor.ExecuteVideoConversion)),
            Arg.Any<IState>());
    }

    [TestMethod]
    public async Task ResizeImage_EnqueuesJobAndReturnsJobId()
    {
        var mockJobClient = Substitute.For<IBackgroundJobClient>();
        var mockResultStore = Substitute.For<IJobResultStore>();
        var service = new MediaProcessingService(mockJobClient, mockResultStore);

        var request = new ResizeImageRequest
        {
            FileData = Google.Protobuf.ByteString.CopyFrom([1, 2, 3]),
            Width = 100,
            Height = 100,
            TargetFormat = GrpcImageFormat.Webp,
            Quality = 80,
            CallbackAddress = "http://localhost:5001"
        };

        var response = await service.ResizeImage(request, null!);

        Assert.IsNotNull(response);
        Assert.IsFalse(string.IsNullOrEmpty(response.JobId));

        mockResultStore.Received(1).Set(response.JobId, Arg.Is<JobResult>(r => r.JobId == response.JobId && r.Status == ModelsJobStatus.Queued));
        mockJobClient.Received(1).Create(
            Arg.Is<Job>(job => job.Method.Name == nameof(MediaJobExecutor.ExecuteImageResize)),
            Arg.Any<IState>());
    }

    [TestMethod]
    public async Task GetJobStatus_ReturnsJobStatus()
    {
        var mockJobClient = Substitute.For<IBackgroundJobClient>();
        var mockResultStore = Substitute.For<IJobResultStore>();
        var service = new MediaProcessingService(mockJobClient, mockResultStore);

        var jobId = "some-job-id";
        var expectedResult = new JobResult(jobId, ModelsJobStatus.Completed, ResultBytes: [4, 5, 6]);
        mockResultStore.TryGet(jobId, out Arg.Any<JobResult?>())
            .Returns(x => { x[1] = expectedResult; return true; });

        var request = new GetJobStatusRequest { JobId = jobId };
        var response = await service.GetJobStatus(request, null!);

        Assert.IsNotNull(response);
        Assert.AreEqual(jobId, response.JobId);
        Assert.AreEqual(GrpcJobStatus.Completed, response.Status);
        CollectionAssert.AreEqual(expectedResult.ResultBytes, response.ResultData.ToByteArray());
    }
}
