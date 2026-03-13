#!/usr/bin/env bash
set -euo pipefail

export AWS_PROFILE=copilot
export AWS_REGION=us-east-2

SG_ID="sg-0b539947e6ed29cf0"
CLUSTER="botbeam-prod-Cluster-RF1huELGViqb"

echo "=== BotBeam Deploy ==="
echo ""

# 1. Get the current ECS task IP (this is the "old" IP we'll revoke later)
echo "Finding current ECS task IP..."
OLD_TASK_ARN=$(aws ecs list-tasks --cluster "$CLUSTER" \
  --query "taskArns[0]" --output text 2>/dev/null || echo "None")

OLD_IP=""
if [ "$OLD_TASK_ARN" != "None" ] && [ -n "$OLD_TASK_ARN" ]; then
  OLD_ENI=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$OLD_TASK_ARN" \
    --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)
  OLD_IP=$(aws ec2 describe-network-interfaces --network-interface-ids "$OLD_ENI" \
    --query "NetworkInterfaces[0].Association.PublicIp" --output text)
  echo "Current task IP: $OLD_IP"
else
  echo "No running task found (first deploy?)"
fi

# 2. Open security group so the new task can connect to RDS during startup
echo ""
echo "Opening RDS security group for deploy..."
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
  --protocol tcp --port 3306 --cidr 0.0.0.0/0 2>/dev/null || true
echo "Security group opened."

# 3. Deploy via Copilot
echo ""
echo "Deploying..."
copilot svc deploy --name web --env prod

# 4. Get the new ECS task's public IP
echo ""
echo "Finding new task IP..."
sleep 5

TASK_ARN=$(aws ecs list-tasks --cluster "$CLUSTER" \
  --query "taskArns[0]" --output text)

if [ "$TASK_ARN" = "None" ] || [ -z "$TASK_ARN" ]; then
  echo "ERROR: No running task found after deploy. Closing security group."
  aws ec2 revoke-security-group-ingress --group-id "$SG_ID" \
    --protocol tcp --port 3306 --cidr 0.0.0.0/0 2>/dev/null || true
  exit 1
fi

ENI=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" \
  --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)

NEW_IP=$(aws ec2 describe-network-interfaces --network-interface-ids "$ENI" \
  --query "NetworkInterfaces[0].Association.PublicIp" --output text)

echo "New task IP: $NEW_IP"

# 5. Lock down security group: remove 0.0.0.0/0, add specific IPs
echo "Locking down security group..."
aws ec2 revoke-security-group-ingress --group-id "$SG_ID" \
  --protocol tcp --port 3306 --cidr 0.0.0.0/0 2>/dev/null || true

# Revoke old ECS IP if it changed
if [ -n "$OLD_IP" ] && [ "$OLD_IP" != "$NEW_IP" ]; then
  echo "Revoking old ECS IP ($OLD_IP)..."
  aws ec2 revoke-security-group-ingress --group-id "$SG_ID" \
    --protocol tcp --port 3306 --cidr "${OLD_IP}/32" 2>/dev/null || true
fi

# Add new ECS IP
echo "Authorizing new ECS IP ($NEW_IP)..."
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
  --protocol tcp --port 3306 --cidr "${NEW_IP}/32" 2>/dev/null || true

# Keep developer IP if present
LOCAL_IP=$(curl -s https://checkip.amazonaws.com)
echo "Ensuring local IP ($LOCAL_IP) is authorized..."
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" \
  --protocol tcp --port 3306 --cidr "${LOCAL_IP}/32" 2>/dev/null || true

echo ""
echo "=== Deploy complete ==="
echo "ECS IP:   $NEW_IP"
echo "Local IP: $LOCAL_IP"
echo "Site:     https://botbeam.ironcliff.ai"
