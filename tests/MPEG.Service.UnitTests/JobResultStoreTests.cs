using SocialLight.MPEG.Service.Models;
using SocialLight.MPEG.Service.Services;

namespace SocialLight.MPEG.Service.UnitTests;

[TestClass]
public class JobResultStoreTests
{
    [TestMethod]
    public void SetAndGetJobResult_Works()
    {
        var store = new JobResultStore();
        var jobId = "test-job-1";
        var expected = new JobResult(jobId, JobStatus.Queued);

        store.Set(jobId, expected);
        var exists = store.TryGet(jobId, out var actual);

        Assert.IsTrue(exists);
        Assert.AreEqual(expected.JobId, actual?.JobId);
        Assert.AreEqual(expected.Status, actual?.Status);
    }

    [TestMethod]
    public void UpdateStatus_Works()
    {
        var store = new JobResultStore();
        var jobId = "test-job-2";
        store.Set(jobId, new JobResult(jobId, JobStatus.Queued));

        store.UpdateStatus(jobId, JobStatus.Processing);
        store.TryGet(jobId, out var actual);

        Assert.AreEqual(JobStatus.Processing, actual?.Status);
    }

    [TestMethod]
    public void CompleteJob_Works()
    {
        var store = new JobResultStore();
        var jobId = "test-job-3";
        store.Set(jobId, new JobResult(jobId, JobStatus.Queued));

        var dummyBytes = new byte[] { 1, 2, 3 };
        store.CompleteJob(jobId, dummyBytes);
        store.TryGet(jobId, out var actual);

        Assert.AreEqual(JobStatus.Completed, actual?.Status);
        CollectionAssert.AreEqual(dummyBytes, actual?.ResultBytes);
    }
}
