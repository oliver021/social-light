global using System;
global using System.Collections.Generic;
global using System.Linq;
global using System.Threading;
global using System.Threading.Tasks;
global using MediatR;
global using Microsoft.AspNetCore.Mvc;
global using SocialLight.Ordering.API.Application.Commands;
global using SocialLight.Ordering.API.Application.Models;
global using SocialLight.Ordering.API.Infrastructure.Services;
global using SocialLight.Ordering.Domain.AggregatesModel.BuyerAggregate;
global using SocialLight.Ordering.Domain.Events;
global using SocialLight.Ordering.Domain.Exceptions;
global using SocialLight.Ordering.Domain.SeedWork;
global using SocialLight.Ordering.Infrastructure.Idempotency;
global using Microsoft.Extensions.Logging;
global using NSubstitute;
global using SocialLight.Ordering.UnitTests;
global using Microsoft.VisualStudio.TestTools.UnitTesting;

[assembly: Parallelize(Workers = 0, Scope = ExecutionScope.MethodLevel)]
