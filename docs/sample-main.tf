# Before: the manifest CloudPulse audits. Not a live AWS account.
resource "aws_security_group" "web_sg" {
  name        = "web-server-sg"
  description = "Security group with open inbound SSH"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "app_db" {
  allocated_storage = 100
  engine            = "postgres"
  instance_class    = "db.t3.medium"
  storage_encrypted = false
}

resource "aws_instance" "batch_processor" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "m5.4xlarge"
}
