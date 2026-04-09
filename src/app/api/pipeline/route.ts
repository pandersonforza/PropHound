import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const projects = await prisma.pipelineProject.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch pipeline projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.address || !body.city) {
      return NextResponse.json(
        { error: 'Missing required fields: address, city' },
        { status: 400 }
      );
    }

    const project = await prisma.pipelineProject.create({
      data: {
        address: body.address,
        city: body.city,
        state: body.state ?? null,
        projectNumber: body.projectNumber ?? null,
        dealType: body.dealType ?? null,
        siteAcceptance: body.siteAcceptance ?? null,
        milestones: body.milestones ?? null,
        dueDiligence: body.dueDiligence ?? null,
        civilPermittingTeam: body.civilPermittingTeam ?? null,
        architectTeam: body.architectTeam ?? null,
        asBuilts: body.asBuilts ?? null,
        altaTopo: body.altaTopo ?? null,
        geotech: body.geotech ?? null,
        phase1Testing: body.phase1Testing ?? null,
        asbestosTesting: body.asbestosTesting ?? null,
        signageVendor: body.signageVendor ?? null,
        signResourcePm: body.signResourcePm ?? null,
        sentTo7B: body.sentTo7B ?? null,
        signageApprovedBy7B: body.signageApprovedBy7B ?? null,
        testFitRequested: body.testFitRequested ?? null,
        testFitCompleted: body.testFitCompleted ?? null,
        testFitApproved: body.testFitApproved ?? null,
        loiExecuted: body.loiExecuted ?? null,
        titleReceived: body.titleReceived ?? null,
        titleReviewed: body.titleReviewed ?? null,
        sir: body.sir ?? null,
        initialBudget: body.initialBudget ?? null,
        leaseExecuted: body.leaseExecuted ?? null,
        rentCommencementDate: body.rentCommencementDate ?? null,
        powerApplicationSubmitted: body.powerApplicationSubmitted ?? null,
        designKickoffCall: body.designKickoffCall ?? null,
        designDocsApproved: body.designDocsApproved ?? null,
        planningSubmittal: body.planningSubmittal ?? null,
        planningApproved: body.planningApproved ?? null,
        rowPermitsApproved: body.rowPermitsApproved ?? null,
        cdKickoffCall: body.cdKickoffCall ?? null,
        ispIntakeFormSent: body.ispIntakeFormSent ?? null,
        cdSubmittedTo7B: body.cdSubmittedTo7B ?? null,
        approved7B: body.approved7B ?? null,
        cdsSubmitted: body.cdsSubmitted ?? null,
        healthSubmitted: body.healthSubmitted ?? null,
        outToBid: body.outToBid ?? null,
        prebidMeeting: body.prebidMeeting ?? null,
        bidsDue: body.bidsDue ?? null,
        finalBudgetApproved: body.finalBudgetApproved ?? null,
        generalContractor: body.generalContractor ?? null,
        gcContractIssued: body.gcContractIssued ?? null,
        permitsIssued: body.permitsIssued ?? null,
        constructionStart: body.constructionStart ?? null,
        turnoverCoo: body.turnoverCoo ?? null,
        openDate: body.openDate ?? null,
        planningApprovalProcess: body.planningApprovalProcess ?? null,
        buildingApprovalProcess: body.buildingApprovalProcess ?? null,
        developmentNotes: body.developmentNotes ?? null,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Failed to create pipeline project:', error);
    return NextResponse.json(
      { error: 'Failed to create pipeline project' },
      { status: 500 }
    );
  }
}
