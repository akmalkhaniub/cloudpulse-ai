# After: the same manifest with the rule-engine fixes applied.
# Savings use the local us-east-1 price table, not the AWS Price List API.
# Opening this as a GitHub pull request needs GITHUB_TOKEN.
resource "aws_security_group" "web_sg" {
  name        = "web-server-sg"
  description = "Security group with open inbound SSH"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"] # Restricted to corporate VPC CIDR
  }
}

resource "aws_db_instance" "app_db" {
  allocated_storage = 100
  engine            = "postgres"
  instance_class    = "db.t3.medium"
  storage_encrypted = true
  kms_key_id        = "alias/aws/rds"
}

resource "aws_instance" "batch_processor" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t4g.xlarge" # Rightsized using the local us-east-1 price table
}
