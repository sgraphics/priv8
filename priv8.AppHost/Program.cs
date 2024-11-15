var builder = DistributedApplication.CreateBuilder(args);

var cache = builder.AddRedis("cache");

var privateKey = builder.AddParameter("privatekey", secret: true);

var apiService = builder.AddProject<Projects.priv8_ApiService>("apiservice");

var akaveContainer = builder.AddDockerfile("akave", "./akave")
	.WithEnvironment("NODE_ADDRESS", "connect.akave.ai:5500")
	.WithEnvironment("PRIVATE_KEY", privateKey)
	//.WithEnvironment("CORS_ORIGIN", "*")
	.WithEndpoint(scheme: "http", targetPort: 3000, port: 8000);

builder.AddProject<Projects.priv8_Web>("webfrontend")
	.WithExternalHttpEndpoints()
	.WithReference(cache)
	.WithReference(akaveContainer.GetEndpoint("http"))
	.WithReference(apiService);

builder.Build().Run();
