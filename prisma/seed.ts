import { PrismaClient, Role, Severity, Status } from '@prisma/client'
import { PasswordService } from '../src/auth/password';

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...');

  console.log('👥 Creating demo users...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@secops.com' },
    update: {},
    create: {
      email: 'admin@secops.com',
      passwordHash: await PasswordService.hash('SecurePass123!'),
      role: Role.CLIENT_ADMIN,
    },
  })

  const analystUser = await prisma.user.upsert({
    where: { email: 'analyst@secops.com' },
    update: {},
    create: {
      email: 'analyst@secops.com',
      passwordHash: await PasswordService.hash('AnalystPass123!'),
      role: Role.ANALYST,
    },
  })

  const clientUser = await prisma.user.upsert({
    where: { email: 'user@secops.com' },
    update: {},
    create: {
      email: 'user@secops.com',
      passwordHash: await PasswordService.hash('UserPass123!'),
      role: Role.CLIENT_USER,
    },
  })

  const felipeduarteUser = await prisma.user.upsert({
    where: { email: 'felipeduarte@secops.com' },
    update: {},
    create: {
      email: 'felipeduarte@secops.com',
      passwordHash: await PasswordService.hash('SecurePass123!'),
      role: Role.ANALYST,
    },
  })
  console.log('✅ Users created successfully.');

  console.log('🚨 Creating sample incidents...');
  const incidents = [
    {
      title: 'Suspicious Network Activity Detected',
      description: 'Multiple failed login attempts detected from IP address 192.168.1.100. Potential brute force attack in progress.',
      severity: Severity.HIGH,
      status: Status.OPEN,
      source: 'SIEM',
      createdById: adminUser.id,
    },
    {
      title: 'Malware Detection on Workstation',
      description: 'Antivirus software detected and quarantined malware on workstation WS-001. User reported suspicious email attachment.',
      severity: Severity.CRITICAL,
      status: Status.IN_PROGRESS,
      source: 'Endpoint Protection',
      createdById: analystUser.id,
    },
    {
      title: 'Unauthorized Access Attempt',
      description: 'Failed authentication attempts to privileged account detected. Account has been temporarily locked.',
      severity: Severity.MEDIUM,
      status: Status.RESOLVED,
      source: 'Active Directory',
      createdById: clientUser.id,
    },
    {
      title: 'Data Exfiltration Alert',
      description: 'Unusual data transfer patterns detected. Large volume of data being transferred to external IP address.',
      severity: Severity.CRITICAL,
      status: Status.OPEN,
      source: 'DLP System',
      createdById: adminUser.id,
    },
    {
      title: 'Phishing Email Campaign',
      description: 'Multiple users reported receiving suspicious emails with malicious attachments. Email security system blocked most attempts.',
      severity: Severity.HIGH,
      status: Status.CLOSED,
      source: 'Email Security',
      createdById: analystUser.id,
    },
  ]

  const createdIncidents = []
  for (const incident of incidents) {
    const created = await prisma.incident.create({
      data: incident,
    })
    createdIncidents.push(created)
  }
  console.log('✅ Incidents created successfully.');

  console.log('💬 Creating sample comments...');
  const comments = [
    {
      incidentId: createdIncidents[0].id,
      authorId: analystUser.id,
      body: 'Investigating the source IP. Appears to be from a known botnet.',
    },
    {
      incidentId: createdIncidents[0].id,
      authorId: adminUser.id,
      body: 'IP has been blocked at the firewall level. Monitoring for additional attempts.',
    },
    {
      incidentId: createdIncidents[1].id,
      authorId: clientUser.id,
      body: 'Workstation has been isolated from the network. Running full system scan.',
    },
    {
      incidentId: createdIncidents[3].id,
      authorId: analystUser.id,
      body: 'Data transfer has been blocked. Investigating the compromised account.',
    },
  ]

  for (const comment of comments) {
    await prisma.incidentComment.create({
      data: comment,
    })
  }

  console.log('✅ Database seeding completed successfully!')
  console.log('👥 Users created:', 4)
  console.log('🚨 Incidents created:', incidents.length)
  console.log('💬 Comments created:', comments.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
