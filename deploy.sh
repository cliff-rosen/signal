#!/bin/bash
# BotBeam deploy script
# Handles the RDS security group dance (open before deploy, lock down after)

set -e

PROFILE="copilot"
REGION="us-east-2"
RDS_SG="sg-0b539947e6ed29cf0"
CLUSTER="botbeam-prod-Cluster-RF1huELGViqb"

echo "=== Opening RDS security group for deploy ==="
AWS_PROFILE=$PROFILE aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG --protocol tcp --port 3306 --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || echo "(already open)"

echo "=== Deploying to ECS ==="
AWS_PROFILE=$PROFILE copilot svc deploy --name web --env prod

echo "=== Getting new ECS task IP ==="
TASK_ARN=$(AWS_PROFILE=$PROFILE aws ecs list-tasks \
  --cluster $CLUSTER --region $REGION \
  --query "taskArns[0]" --output text)

ENI=$(AWS_PROFILE=$PROFILE aws ecs describe-tasks \
  --cluster $CLUSTER --tasks "$TASK_ARN" --region $REGION \
  --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text)

NEW_IP=$(AWS_PROFILE=$PROFILE aws ec2 describe-network-interfaces \
  --network-interface-ids "$ENI" --region $REGION \
  --query "NetworkInterfaces[0].Association.PublicIp" --output text)

echo "New ECS IP: $NEW_IP"

echo "=== Locking down RDS security group ==="
# Remove 0.0.0.0/0
AWS_PROFILE=$PROFILE aws ec2 revoke-security-group-ingress \
  --group-id $RDS_SG --protocol tcp --port 3306 --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null || true

# Remove all old /32 ECS IPs (keep dev IP)
DEV_IP="71.211.141.248"
EXISTING=$(AWS_PROFILE=$PROFILE aws ec2 describe-security-groups \
  --group-ids $RDS_SG --region $REGION \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`3306\`].IpRanges[].CidrIp" --output text)

for CIDR in $EXISTING; do
  IP="${CIDR%/32}"
  if [ "$IP" != "$DEV_IP" ] && [ "$IP" != "$NEW_IP" ]; then
    echo "  Removing old IP: $CIDR"
    AWS_PROFILE=$PROFILE aws ec2 revoke-security-group-ingress \
      --group-id $RDS_SG --protocol tcp --port 3306 --cidr "$CIDR" \
      --region $REGION 2>/dev/null || true
  fi
done

# Add new ECS IP
AWS_PROFILE=$PROFILE aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG --protocol tcp --port 3306 --cidr "$NEW_IP/32" \
  --region $REGION 2>/dev/null || echo "(already exists)"

echo "=== Verifying ==="
curl -sf https://botbeam.ironcliff.ai/health && echo " OK" || echo " FAILED"

echo ""
echo "RDS security group now allows:"
echo "  - $DEV_IP/32 (dev)"
echo "  - $NEW_IP/32 (ECS)"
echo ""
echo "Done."
