// Define a declarative pipeline
pipeline {
    // Agent specifies where the pipeline will run.
    // 'any' means it can run on any available agent.
    // For more control, you might specify a label or a Docker agent.
    agent any

    // Environment variables for AWS credentials, ECR details, and App Host details.
    // IMPORTANT: These should be managed securely in Jenkins using the Credentials plugin.
    // Replace placeholder values with your actual AWS credentials, ECR URIs,
    // app host IP/user, and remote MongoDB URI.
    environment {
        AWS_ACCESS_KEY_ID = credentials('aws-access-key-id') // Jenkins credential ID for AWS Access Key ID
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key') // Jenkins credential ID for AWS Secret Access Key
        ECR_SERVER_REPOSITORY_URI = 'your-ecr-server-repository-uri' // e.g., 123456789012.dkr.ecr.your-aws-region.amazonaws.com/movies-app-server
        ECR_CLIENT_REPOSITORY_URI = 'your-ecr-client-repository-uri' // e.g., 123456789012.dkr.ecr.your-aws-region.amazonaws.com/movies-app-client
        AWS_REGION = 'your-aws-region' // e.g., us-east-1

        // App Host details
        APP_HOST_IP = 'your-app-host-ip' // e.g., 192.168.1.100 or your.app.domain.com
        APP_HOST_USER = 'root' // User with SSH access and Docker permissions on the app host
        APP_HOST_SSH_CREDENTIAL_ID = 'app-host-ssh-key' // Jenkins credential ID for SSH private key (Username with private key)

        // Remote MongoDB URI for the server to connect to
        MONGO_DB_URI_REMOTE = 'mongodb://your-remote-mongodb-ip:27017/moviesdb' // Replace with your actual remote MongoDB URI

        // Derived image names
        SERVER_IMAGE_NAME = "${ECR_SERVER_REPOSITORY_URI}:latest"
        CLIENT_IMAGE_NAME = "${ECR_CLIENT_REPOSITORY_URI}:latest"
    }

    // Define the stages of the pipeline
    stages {
        // Stage 1: Git Checkout
        // This stage is responsible for pulling the latest code from your Git repository.
        stage('Checkout') {
            steps {
                script {
                    // Clean workspace before checkout (optional, but good for clean builds)
                    cleanWs()
                    // Checkout the Git repository.
                    // Replace 'your_repository_url_here' with the URL of your GitHub repository.
                    // Replace 'main' with your default branch name if it's different (e.g., 'master').
                    git branch: 'main', url: 'https://github.com/bhagesh-github/movies-app.git'
                }
            }
        }

        // Stage 2: Build and Publish Server Image
        // This stage builds the Docker image for your Node.js server and pushes it to ECR.
        stage('Build and Publish Server Image') {
            steps {
                script {
                    // Navigate to the server directory where the Dockerfile and code reside
                    dir('server') {
                        // Authenticate Docker with ECR.
                        // This command retrieves an authentication token from ECR and uses it to log in Docker.
                        sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_SERVER_REPOSITORY_URI}"

                        // Build the Docker image for the Node.js server.
                        // -t tags the image with the ECR repository URI and 'latest'.
                        // -f specifies the Dockerfile to use (assuming it's in the 'server' directory).
                        // '.' specifies the build context (the current directory, i.e., 'server').
                        sh "docker build -t ${SERVER_IMAGE_NAME} -f Dockerfile ."

                        // Push the built Docker image to the ECR repository.
                        sh "docker push ${SERVER_IMAGE_NAME}"
                    }
                }
            }
        }

        // Stage 3: Build and Publish Client Image
        // This stage builds the Docker image for your React client and pushes it to ECR.
        stage('Build and Publish Client Image') {
            steps {
                script {
                    // Navigate to the client directory where the Dockerfile and code reside
                    dir('client') {
                        // Authenticate Docker with ECR.
                        // This command retrieves an authentication token from ECR and uses it to log in Docker.
                        sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_CLIENT_REPOSITORY_URI}"

                        // Build the Docker image for the React client.
                        // Note: The Dockerfile for the client is expected to be in the 'client' directory.
                        // The build context needs to be the root of the project to access the 'nginx' folder
                        // as specified in the client's Dockerfile.
                        // So, we use '..' as the build context and specify the Dockerfile path relative to it.
                        sh "docker build -t ${CLIENT_IMAGE_NAME} -f Dockerfile .."

                        // Push the built Docker image to the ECR repository.
                        sh "docker push ${CLIENT_IMAGE_NAME}"
                    }
                }
            }
        }

        // Stage 4: Deploy to App Host
        // This stage connects to the application host via SSH, stops existing containers,
        // pulls the new images, and runs fresh containers for both server and client.
        stage('Deploy to App Host') {
            steps {
                // Use sshagent to securely manage SSH credentials
                sshagent(credentials: [APP_HOST_SSH_CREDENTIAL_ID]) {
                    // Execute shell commands on the remote application host
                    sh """
                        # Connect to the application host and execute commands
                        # -o StrictHostKeyChecking=no is used to bypass host key checking for initial connection.
                        # For production, it's recommended to pre-add host keys to known_hosts.
                        ssh -o StrictHostKeyChecking=no ${APP_HOST_USER}@${APP_HOST_IP} << 'EOF'
                            echo "Successfully logged into app host: ${APP_HOST_IP}"

                            # Authenticate Docker with ECR on the app host
                            echo "Logging into ECR on app host to pull images..."
                            aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_SERVER_REPOSITORY_URI}
                            aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_CLIENT_REPOSITORY_URI}
                            echo "ECR login complete on app host."

                            # --- Deploy Server Container ---
                            echo "Stopping and removing any existing server container (movies-server)..."
                            # '|| true' ensures the command doesn't fail if the container doesn't exist
                            docker stop movies-server || true
                            docker rm movies-server || true

                            echo "Pulling latest server image: ${SERVER_IMAGE_NAME}..."
                            docker pull ${SERVER_IMAGE_NAME}

                            echo "Running new server container (movies-server) on port 5000..."
                            # -d: run in detached mode
                            # --name: assign a name to the container
                            # -p: map host port 5000 to container port 5000
                            # -e MONGO_URI: pass the MongoDB connection string as an environment variable
                            docker run -d --name movies-server -p 5000:5000 -e MONGO_URI="${MONGO_DB_URI_REMOTE}" ${SERVER_IMAGE_NAME}
                            echo "Server deployed."

                            # --- Deploy Client Container ---
                            echo "Stopping and removing any existing client container (movies-client)..."
                            docker stop movies-client || true
                            docker rm movies-client || true

                            echo "Pulling latest client image: ${CLIENT_IMAGE_NAME}..."
                            docker pull ${CLIENT_IMAGE_NAME}

                            echo "Running new client container (movies-client) on port 80..."
                            # -d: run in detached mode
                            # --name: assign a name to the container
                            # -p: map host port 80 to container port 80
                            docker run -d --name movies-client -p 80:80 ${CLIENT_IMAGE_NAME}
                            echo "Client deployed."

                            echo "Deployment process completed on ${APP_HOST_IP}"
                        EOF
                    """
                }
            }
        }
    }

    // Post-build actions (optional)
    post {
        // Always execute this block, regardless of stage success or failure
        always {
            // Clean up the workspace after the build is complete
            cleanWs()
        }
        // Execute this block only if the pipeline build is successful
        success {
            echo 'Pipeline finished successfully!'
        }
        // Execute this block only if the pipeline build fails
        failure {
            echo 'Pipeline failed!'
        }
    }
}
