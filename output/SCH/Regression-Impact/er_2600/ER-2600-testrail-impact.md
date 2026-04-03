# Regression Impact Analysis — ER-2600

**Story:** Ingka | Ability to automatically transition an employee within a shift across locations
**TestRail:** Scheduling (Project 10) / Master Suite (190)
**Total Master Suite:** 8017 test cases

---

## Direct Impact
**Total: 333** (Automated: 53 | Manual: 280)

| Case ID | Status | Title |
|---------|--------|-------|
| C447134 | Manual | Verify Smart template for parent child and P2P LG |
| C454049 | Manual | Verify the shifts without transition |
| C454050 | Manual | Verify the shifts with only location transition |
| C454051 | Manual | Verify the shifts with only work role transition |
| C454052 | Manual | Verify the offer, swap and cover working fine for the transition shifts |
| C462565 | Manual | Verify case 5-7 with transitions |
| C462566 | Manual | Verify case 5-7 without transitions |
| C473387 | Manual | Verify the feature for P2P LG |
| C473389 | Manual | Verify the feature with transition enabled |
| C473390 | Manual | Verify the feature with transition disabled |
| C474838 | Manual | Verify multiple smart template can support for P2P LG |
| C474843 | Manual | Verify cannot edit smart template on P2P parent level |
| C474964 | Manual | Verifity the creat multi week shift pattern in P2PLG |
| C474968 | Manual | Verify the create smart template function with disable work role in P2PLG |
| C474972 | Manual | Verify the smart template in P2PLG location working as before |
| C474975 | Manual | As a manager, I can leave one or more segments of a smart template shift as Auto-assign an |
| C474976 | Manual | As a manager, I can mark an entire shift as auto-assign and the optimizer will assign work |
| C474978 | Manual | Verify the smart template in P2PLG location working as before |
| C446456 | Manual | Verify the tooltip of the shift which only has work role transition |
| C446461 | Manual | Verify the tooltip of the shift which only has location transition |
| C446447 | Manual | Verify the visibility of setting "Enable sub location transitions?" |
| C446448 | Manual | Verify the functionality of Yes/No button of setting "Enable sub location transitions?" |
| C446449 | Manual | Verify the visibility of setting "Enable work role transitions?" |
| C446450 | Manual | Verify the functionality of Yes/No button of setting "Enable work role transitions?" |
| C446451 | Manual | Verify setting "Enable sub location transitions?" should not show in Shift Segments sectio |
| C446473 | Manual | Verify can create a shift with a sub location transition |
| C446487 | Manual | Verify can create a shift with a sub location transition |
| C446492 | Manual | Verfiy cannot add a sub location transition if the time is not consecutive |
| C446493 | Manual | Verfiy can add a sub location transition if the time is consecutive |
| C446503 | Manual | Verfiy cannot add a sub location transition if the time is not consecutive |
| C446504 | Manual | Verfiy cannot add a sub location transition if the time is consecutive |
| C446512 | Manual | Verify the visibility of shift location transition in day view |
| C446513 | Manual | Verify the sub location transition icon |
| C446514 | Manual | Verify the visibility of shift location transition in day view group by work role |
| C446515 | Manual | Verify the visibility of shift location transition in day view group by location |
| C446517 | Manual | Verify the visibility of shift location transition in day view group by all |
| C446519 | Manual | Verify the visibility of shift location transition in week view |
| C446520 | Manual | Verify the sub location transition icon |
| C446521 | Manual | Verify the visibility of shift location transition in week view group by work role |
| C446522 | Manual | Verify the visibility of shift location transition in week view group by location |
| C446524 | Manual | Verify the visibility of shift location transition in week view group by all |
| C451285 | Manual | 1.Peer to Peer location type_Verify Schedule Overview Vs. Schedule tab for the future week |
| C451286 | Manual | 2.Peer to Peer location type_Update the Config to some other value & verify Schedule Overv |
| C451287 | Manual | 3.Peer to Peer location type_Verify future weeks shown on Forecast> Demand & Labor tabs |
| C453007 | Manual | 2_Verify it shows Parent of peer location all roster employees on Multi-week view tab when |
| C454445 | Manual | 1.Verify manager is able to delete Schedule or not when all the child locations Schedule i |
| C454446 | Manual | 2.Verify manager is able to delete or not when any the child locations Schedule is Not Pub |
| C454447 | Manual | 3.Verify manager is able to delete or not when all of the child locations Schedule is Not  |
| C454452 | Manual | 3. Verify Refresh button refreshes & shows the data correctly for locations on District Ma |
| C455957 | Manual | Verify can click on the shift with location transition in edit mode while group by All |
| C455958 | Manual | Verify can click on the shift with location transition in edit mode while group by TM |
| C455959 | Manual | Verify can click on the shift with location transition in edit mode while group by Job Tit |
| C455960 | Manual | Verify can click on the shift with location transition in edit mode while group by Work Ro |
| C455961 | Manual | Verify can click on the shift with location transition in edit mode while group by Locatio |
| C455962 | Manual | Verify can click on the shift with location transition in edit mode while group by Pattern |
| C116466 | Automated | validate auto scheduler will respect the Minors Rules |
| C244415 | Manual | verify update school calendar in other location from workforce sharing location group |
| C82614 | Manual | Verify all cases in both P/C and P2p LG |
| C227542 | Automated | Validate the auto offer TMs workflow for new create shift UI on P2P LG |
| C227544 | Automated | Validate the manuel offer TMs workflow for new create shift UI on P2P LG |
| C244452 | Manual | Verify TM should not be auto scheduled in previous week of the hire date |
| C244455 | Manual | Verify TM should not be auto scheduled in the week of the hire date |
| C244458 | Manual | Verify TM should be auto scheduled in the next week of the hire date |
| C337788 | Automated | Verify the functionality of option "Auto schedule team members during off weeks" |
| C67315 | Automated | Shifts will go to Auto Scheduling  after Activating any TM [TM will start being auto sched |
| C77099 | Automated | Check whether the location is location group or not |
| C269098 | Automated | Verify the location navigation of P2P LG |
| C269099 | Automated | Verify all the sub locations will be generated when generate parent level location for P2P |
| C269100 | Automated | Verify all the sub locations will be ungenerated when ungenerate parent level location for |
| C269101 | Automated | Verify all the sub locations can be generated separately for P2P LG |
| C269102 | Automated | Verify the parent location still can be generated other sub locations successfully when su |
| C269103 | Automated | Verify the roster is at sub-location level for P2P LG |
| C269104 | Automated | Verify the P2P LG schedule can be accessed as parent location or sub-location |
| C269105 | Manual | Verify the child locations will be shown as normal location in all reports for P2P LG |
| C269106 | Automated | Verify all sub-locations of P2P LG have their own operating hours |
| C269107 | Automated | Verify all sub-locations of P2P LG have their own demand forecasts/labor forecast/staffing |
| C269108 | Automated | Verify TMs in one location can be searched out on other locations for P2P LG |
| C269109 | Automated | Verify the SM dashboard of P2P LG |
| C244477 | Manual | Verify can create the schedule for parent/child location group |
| C238726 | Automated | Verify peer locations are listed in the schedule overview pape |
| C238728 | Automated | Verify the Not Started status when the peer location schedule has not been created yet |
| C238729 | Automated | Verify the In Progress status when the peer location schedule is created but was never pub |
| C238730 | Automated | Verify the Published status when the peer location schedule has been updated after the pub |
| C238731 | Automated | Verify the Published status when the peer location schedule has been published |
| C238736 | Automated | Verify each peer location can be clicked |
| C238737 | Automated | Verify the peer location is selected in the navigation bar |
| C238738 | Automated | Verify peer locations are listed in the create schedule page |
| C238739 | Automated | Verify the status of all peer locations |
| C238740 | Automated | Verify each peer locations cannot be expanded and collapsed when the schedule is not creat |
| C238741 | Automated | Verify LOCATION GROUP smart card is shown |
| C238742 | Automated | Verify the content on LOCATION GROUP smart card when schedule is not created |
| C238743 | Automated | Verify can create the schedule for all peer locations |
| C238744 | Automated | Verify the value on LOCATION GROUP smart card when schedule is in progress |
| C238745 | Automated | Verify each peer locations can be expanded and collapsed when the schedule is created |
| C238747 | Automated | Verify the value on LOCATION GROUP smart card when schedule is published |
| C238748 | Automated | Verify the actions when the peer location is Not Started |
| C238749 | Automated | Verify "Edit Operating Hours" action when peer location is Not Started |
| C238750 | Automated | Verify "Edit Budget" action when peer location is Not Started |
| C238751 | Automated | Verify "Create Schedule" action when peer location is Not Started |
| C238752 | Automated | Verify the status of the peer location |
| C238753 | Automated | Verify the actions when peer location is In Progress |
| C238754 | Automated | Verify "Publish" action when peer location is In Progress |
| C238755 | Automated | Verify the status of the peer location |
| C238756 | Automated | Verify the actions when peer location is Published |
| C238757 | Automated | Verify the actions when peer locations has unpublished changes |
| C238758 | Automated | Verify "Republish" when peer locations has unpublished changes |
| C238759 | Automated | Verify "Delete" when peer location is Published |
| C238760 | Automated | Verify the status of peer location when it is deleted |
| C238764 | Automated | Verify Not Started will show if all the peer locations are Not Started |
| C238765 | Automated | Verify In Progress will show if some peer locations are Not Started, some are In Progress |
| C238766 | Automated | Verify Published will show if all the peer locations are published |
| C313456 | Automated | Verify Assign TM when TM doesn't have enough travel time for P2P LG |
| C313466 | Automated | Verify Assign TM when TM has time off on that day for p2p LG |
| C313524 | Automated | Verify automatically expand when clicking group by on P2P LG |
| C466593 | Automated | Verify schedule and shift with Location Transitions can be created and published successfu |
| C466605 | Manual | Verify under day view, the location transitions shift can be created, published, edited, r |
| C466635 | Manual | Verify under week view, the location transitions shift can be created, published, edited,  |
| C466636 | Manual | Verify the location transitions shift can't be dragged and dropped to another day/another  |
| C466637 | Manual | Verify the shift without location and role transitions can be dragged and dropped to anoth |
| C466683 | Manual | Verify the shift can be dragged and dropped with role transitions only to another day/loca |
| C467703 | Manual | Verify work time for a day/week of location transitions shift will not be influenced by br |
| C467928 | Manual | Verify when the user edits a shift to add a Location Transition, the related information d |
| C468016 | Manual | Verify edit assignment to an open/ a staff for a location transitions shift and related in |
| C468017 | Manual | Verify create schedule by template/copied shifts with location transitions(451020/367838) |
| C449574 | Manual | Verify the behavior of the Schedule menu to pass the parameter as JSON string to the Optim |
| C449543 | Manual | Validate peerToPeerShiftView under getGlobalSchedulePreferences when Show All Shifts withi |
| C449702 | Manual | Verify Analyze button on Schedule page when logged in user has permission "Analyze Schedul |
| C449747 | Manual | Verify that for P2PLG with only shifts for the selected location configuration |
| C449748 | Manual | Verify that for P2PLG with show all shifts within the location group |
| C449749 | Manual | Verify that for P2P child location with only shifts for the selected location configuratio |
| C449750 | Manual | Verify that for P2P child location with show all shifts within the location group |
| C452918 | Manual | Validate Parent-Child LG, schedule with Work Role/Location Transitions Enabled |
| C464396 | Manual | Verify that the optimizer does not schedule shifts during the rest period. |
| C464401 | Manual | Verify that the optimizer should never get Infeasible solution while generating schedule |
| C464449 | Manual | Validate that the optimizer does not schedule shifts only on weekdays or only on weekends  |
| C465836 | Manual | Workrole Transitions Occur Only at the Top of the Hour |
| C465837 | Manual | Ensure Transitions Honor Store Opening/Closing on Half Hour |
| C465841 | Manual | Schedule Created with Workrole Transition at Incorrect Time |
| C466608 | Manual | Validate 	Editing a schedule before publish is recorded in schedule edit history table for |
| C466609 | Manual | Validate changes before publish are recorded in the Schedule Change Report for Location Gr |
| C467602 | Manual | Verify that the optimizer does not schedule shifts during the rest period. |
| C449450 | Manual | Configure the print template_Verify the behavior when manager do not select the option to  |
| C449502 | Manual | Print formatting_Verify the behavior on Print PDF for Location Group when Admin/manager se |
| C449503 | Manual | Print formatting_Verify the behavior Print PDF for Location Group when Admin/manager selec |
| C449504 | Manual | Print formatting_Verify the behavior on Print PDF for Location Group when Admin/manager se |
| C449505 | Manual | Print formatting_Verify the behavior on Print PDF for Location Group when Admin/manager se |
| C450302 | Manual | Verify the work role/location transition shift in excel print day view file when group by  |
| C450303 | Manual | Verify the work role/location transition shift in excel print day view file when group by  |
| C450304 | Manual | Verify the work role/location transition shift in excel print week view file when group by |
| C450305 | Manual | Verify the work role/location transition shift in excel print week view file when group by |
| C452551 | Manual | 1.Verify Shift notes in PDF for Schedule not having multi-workrole & location transition s |
| C452552 | Manual | 2.Verify Shift notes in Print PDF for Schedule having multi-workrole & location transition |
| C452553 | Manual | 3.Verify updated Shift notes in PDF for Schedule not having multi-workrole & location tran |
| C452554 | Manual | 4.Verify updated Shift notes in Print PDF for Schedule having multi-workrole & location tr |
| C452555 | Manual | 5.Verify shift notes in PDF for copied Schedule not having multi-workrole & location trans |
| C452556 | Manual | 6.Verify Shift notes in PDF for copied Schedule having multi-workrole & location transitio |
| C452557 | Manual | 7.Verify updated shift notes in PDF for copied Schedule not having multi-workrole & locati |
| C452558 | Manual | 8.Verify updated shift notes in PDF for copied Schedule having multi-workrole & location t |
| C452835 | Manual | Verify the work role/location transition shift in excel print day view file when group by  |
| C452836 | Manual | Verify the work role/location transition shift in excel print day view file when group by  |
| C452837 | Manual | Verify the work role/location transition shift in excel print week view file when group by |
| C452838 | Manual | Verify the work role/location transition shift in excel print week view file when group by |
| C462663 | Manual | Accept and decline the edited shift of auto-schedule (not from smart template) for republi |
| C462656 | Manual | Accept and decline the edited shift of auto-schedule (not from smart template) by Admin |
| C462657 | Manual | Accept and decline the non-edited shift of auto-schedule (not from smart template) by Admi |
| C462660 | Manual | Accept and decline the edited shift of auto-schedule (not from smart template) by SM |
| C462661 | Manual | Accept and decline the non-edited shift of auto-schedule (not from smart template) by SM |
| C455376 | Manual | Verify TM can claim the non-transition open shift on Team Schedule page |
| C455377 | Manual | Verify TM can claim the transition open shift on Team Schedule page |
| C455382 | Manual | Verify TM can claim the open shift from home for P2P LG |
| C458204 | Manual | Validate that for P2P location when input budget is given in total wage($); it shows prope |
| C458206 | Manual | Validate that for P2P location when input budget is given in total wage($); it shows prope |
| C457924 | Manual | Verify the scheduled hrs on DM schedule view display correct for LG with transition enable |
| C458212 | Manual | Validate that able to see Day view when the ABSwitch ScheduleDisableDayMode is no longer p |
| C458716 | Manual | Verify the will be published employees display correct on publish modal for regular locati |
| C458717 | Manual | Verify the will be published locations display correct on publish modal for P2P LG when di |
| C458718 | Manual | Verify the will be published locations display correct on publish modal for PC LG when dis |
| C458719 | Manual | Verify the will be published employees display correct on publish modal for regular locati |
| C458720 | Manual | Verify the will be published locations display correct on publish modal for P2P LG when en |
| C458721 | Manual | Verify the will be published locations display correct on publish modal for PC LG when ena |
| C461581 | Manual | Verify schedule can be created when "Specify all the shift start times or end times or bot |
| C461589 | Manual | Verify case 5-7 with transitions |
| C461590 | Manual | Verify case 5-7 without transitions |
| C461699 | Manual | Verify that the "Enable auto-scheduled work role transitions in shift assignment?" option  |
| C461700 | Manual | Verify that enabling "Enable auto-scheduled work role transitions in shift assignment?" di |
| C461701 | Manual | Verify that after disabling "Enable auto-scheduled work role transitions in shift generati |
| C461624 | Manual | Verifity the creat multi week shift pattern in P2PLG |
| C461628 | Manual | Verify the create smart template function with disable work role in P2PLG |
| C462596 | Manual | Verify there is no edit budget page show when generate PeerToPeer Location group |
| C462666 | Manual | Accept and decline the edited shift of auto-schedule (not from smart template) by Admin |
| C462667 | Manual | Accept and decline the non-edited shift of auto-schedule (not from smart template) by Admi |
| C462670 | Manual | Accept and decline the edited shift of auto-schedule (not from smart template) by SM |
| C462671 | Manual | Accept and decline the non-edited shift of auto-schedule (not from smart template) by SM |
| C462673 | Manual | Accept and decline the edited shift of auto-schedule (not from smart template) for republi |
| C464054 | Manual | Verify the breaks eliminate if within 1 hour of transition time unless at transition time  |
| C464055 | Manual | Verify the breaks eliminate if within 1 hour of transition time unless at transition time  |
| C464056 | Manual | Verify the breaks eliminate if within 1 hour of transition time unless at transition time  |
| C464057 | Manual | Validate the optimizer creating shifts when TM does not want to work for consecutive days |
| C464058 | Manual | Validate the optimizer creating shifts when TM wants to work for consecutive days |
| C464410 | Manual | Validate optimizer creates optimal schedule solution when minimum hours are disabled and a |
| C464411 | Manual | Validate optimizer creates optimal schedule solution when minimum hours are enabled and ad |
| C465790 | Manual | Verify the week grid view when Disable transition with P2PLG |
| C465791 | Manual | Verify the week grid view when Disable transition with PCLG |
| C465792 | Manual | Verify the week grid view when Enable transition with PCLG |
| C465793 | Manual | Verify the week grid view when Enable transition with Regular |
| C465789 | Manual | Verify the week grid view when Disable transition with regular location |
| C465820 | Manual | Verify the day grid view when Disable transition with regular location |
| C465821 | Manual | Verify the day grid view when Disable transition with P2PLG |
| C465822 | Manual | Verify the day grid view when Disable transition with PCLG |
| C465823 | Manual | Verify the day grid view when Enable transition with PCLG |
| C465824 | Manual | Verify the day grid view when Enable transition with Regular |
| C467943 | Manual | Verify break coverage is working - Disable transition with regular location |
| C467944 | Manual | Verify break coverage is working - Disable transition with PCLG |
| C467945 | Manual | Verify break coverage is working - Disable transition with P2PLG |
| C467946 | Manual | Verify break coverage is working - enable transition with regular location |
| C467947 | Manual | Verify break coverage is working - enable transition with PCLG |
| C468260 | Manual | Verify the optimization flow when enable role transition |
| C468945 | Manual | Verify multiple smart template can support for P2P LG |
| C468950 | Manual | Verify cannot edit smart template on P2P parent level |
| C471137 | Manual | Verify the smart template in P2PLG location working as before |
| C471140 | Manual | As a manager, I can leave one or more segments of a smart template shift as Auto-assign an |
| C471141 | Manual | As a manager, I can mark an entire shift as auto-assign and the optimizer will assign work |
| C471143 | Manual | Verify the smart template in P2PLG location working as before |
| C473234 | Manual | Verify P2PLG |
| C473315 | Manual | Verify the feature for P2P LG |
| C473317 | Manual | Verify the feature with transition enabled |
| C473318 | Manual | Verify the feature with transition disabled |
| C473960 | Manual | Verify all the cases for P2P LG |
| C476183 | Manual | Verify When Enable manager created location transitions = Yes |
| C476184 | Manual | Verify When Enable manager created location transitions = No |
| C476185 | Manual | Verify When What locations are enabled for transition = Within location group |
| C476186 | Manual | Verify When What locations are enabled for transition = Within district |
| C476187 | Manual | Verify When What locations are enabled for transition = Within workforce sharing group |
| C476188 | Manual | Verify I can select a time of transition, and optionally a new role, at the new sub locati |
| C476192 | Manual | Verify location transition icon |
| C476193 | Manual | Verify I can add or delete a sub location transition |
| C476194 | Manual | Verify I can see when a shift has a sub location transition |
| C476197 | Manual | Verify the shift is displayed in all locations that are part of the transitions |
| C476217 | Manual | Verify the schedule flow in P2PLG |
| C476836 | Manual | Validate shift like 10 PM – 3 AM (next day), where the next day has a DST backward transit |
| C477434 | Manual | Verify all the cases for P2P LG |
| C488525 | Manual | Verify the locked template shifts when enable location transition |
| C488526 | Manual | Verify the  locked template shifts when disable location transition |
| C488528 | Manual | Verify the  locked template shifts in P2PLG |
| C488530 | Manual | Verify the regression when enable location transition |
| C488531 | Manual | Verify the regression when disable location transition |
| C488533 | Manual | Verify the regression in P2PLG |
| C488645 | Manual | Verify Time Off TMs filter for P2P LG |
| C500233 | Manual | Verify the violation for P2P LG |
| C500236 | Manual | Verify Compliance Widget violation can show correct with all above violation for P2P LG |
| C500326 | Manual | Verify the new ux on P2PLG |
| C500328 | Manual | Verify the new ux when enable transition |
| C500329 | Manual | Verify the new ux when disable transition |
| C4611628 | Manual | Verify all three-level Flex Group should be shown in locations hierarchy |
| C4611629 | Manual | Verify manual conversion of P2P District to FlexGroup with published schedules and active  |
| C4611630 | Manual | Verify schedule generation works in FlexGroup after manual conversion from P2P with existi |
| C4611631 | Manual | Verify editing and operations on legacy schedules (created in P2P) after conversion to Fle |
| C4611637 | Manual | Verify manager can edit cross-location shift from any included location when allowEntireSh |
| C4611639 | Manual | Verify compliance rules for cross-location shifts use work location (first segment) when c |
| C4611640 | Manual | Verify compliance rules for cross-location shifts use home location when configured |
| C4611645 | Manual | Verify admin can configure allowed location transitions similar to workrole transitions |
| C4611658 | Manual | Verify custom reports use shift segment data model (not shift data) for cross-location hou |
| C4611661 | Manual | Verify Locations API backward compatibility with existing P2P and Parent_Child locationGro |
| C4611662 | Manual | Verify Locations API update operation converts P2P to FlexGroup via locationGroupType chan |
| C4611663 | Manual | Verify shift can include both workrole and location transitions with maximum 3 segments |
| C4611664 | Manual | Verify workrole transitions can occur within single department (no location change require |
| C4611667 | Manual | Verify schedule notes persist through cross-location shift edits regardless of "Allow edit |
| C4611670 | Manual | Verify schedule notes persist through shift modification operations (pattern updates, loca |
| C4611673 | Manual | Verify existing P2P (Peer-to-Peer) location group functionality unchanged when FlexGroup t |
| C4611675 | Manual | Verify child locations are HIDDEN in location hierarchy for PCLG (Parent-Child Location Gr |
| C4611678 | Manual | Verify timesheets can be viewed at the Flex Group Level |
| C4611679 | Manual | Verify timesheets can be viewed at the Flex Group Level |
| C4611680 | Manual | Verify LTC can be set up at flex group level |
| C4611684 | Manual | Employee transitions from Location A and Location B in a single shift. The transition cloc |
| C4611685 | Manual | Employee transitions from Work Role A to Work Role B in a single shift. The transition clo |
| C4605246 | Manual | Verify location is not a flex group location |
| C4605247 | Manual | Verify Transitions across locations may accour |
| C4616001 | Manual | Verify cross-location shifts are created across flex group stores |
| C4616002 | Manual | Verify adding unavailability for one location removes cross-location shift |
| C4616003 | Manual | Verify PTO at one location prevents cross-location shift |
| C4616004 | Manual | Verify fixed shift at one location prevents cross-location shift |
| C4616006 | Manual | Verify cross-location shifts abide by both locations' template rules |
| C4616009 | Manual | Verify assignment transitions are disabled for cross-location shifts |
| C4616011 | Manual | Verify deleting non-owning location's schedule does not affect cross-location shifts |
| C464795 | Manual | Verify the breaks eliminate if within 1 hour of transition time unless at transition time  |
| C464796 | Manual | Verify the breaks eliminate if within 1 hour of transition time unless at transition time  |
| C464797 | Manual | Verify the breaks eliminate if within 1 hour of transition time unless at transition time  |
| C456964 | Manual | PeerToPeer Location Type_Verify Master Template is able to be loaded for a week |
| C456965 | Manual | PeerToPeer Location Type_Verify New Shift is able to be created & saved on Master Template |
| C456966 | Manual | PeerToPeer Location Type_Verify shifts present in Master Template for a week is showing on |
| C456967 | Manual | PeerToPeer Location Type_Verify existing shift is able to be updated & saved on Master Tem |
| C456968 | Manual | PeerToPeer Location Type_Verify existing shift is able to be deleted & saved on Master Tem |
| C456969 | Manual | PeerToPeer Location Type_Verify the Master Template is loading when employee has single sh |
| C455860 | Manual | PeerToPeer Location Type_Verify the Master Template is loading when employee has single sh |
| C456973 | Manual | PeerToPeer Location Type_Verify meal break timing persists on bulk shift edit |
| C456974 | Manual | PeerToPeer Location Type_Verify meal break timing persists on single shift edit |
| C458878 | Manual | Parent Child Location Type_Verify meal break timing persists on bulk edit shift for Parent |
| C458882 | Manual | Verify master template shift adheres to the meal and rest break template based on the asso |
| C458883 | Manual | Verify changed meal and rest break timing consistent in master template and schedule for P |
| C455854 | Manual | P2P Location Type_Verify Master Template is able to be loaded for a week |
| C455855 | Manual | P2P Location Type_Verify New Shift is able to be created & saved on Master Template for a  |
| C455858 | Manual | P2P Location Type_Verify shifts present in Master Template for a week is showing on the ge |
| C455856 | Manual | P2P Location Type_Verify existing shift is able to be updated & saved on Master Template f |
| C455857 | Manual | P2P Location Type_Verify existing shift is able to be deleted & saved on Master Template f |
| C455859 | Manual | P2P Location Type_Verify the Master Template is loading when employee has single shift tri |
| C456970 | Manual | P2P Location Type_Verify the Master Template is loading when employee has single shift tri |
| C455865 | Manual | P2P Location Type_Verify meal break timing persists on single shift edit |
| C455866 | Manual | P2P Location Type_Verify meal break timing persists on bulk shift edit |
| C458532 | Manual | Verify the budget values display correct on all pages for Parent CHild Location Group when |
| C458538 | Manual | Verify the scheduled hrs and shifts always same with the shifts in master template for pee |
| C458541 | Manual | Verify there is no edit budget page show when generate PeerToPeer Location group |
| C458544 | Manual | Verify Hrs over budget value on confirm publish schedule modal when publish schedule for P |
| C458550 | Manual | Verify cannot edit budget on PeerToPeer Location group parent level when enable display bu |
| C458553 | Manual | Verify the scheduled hrs and shifts always same with the shifts in master template for Pee |
| C458555 | Manual | Verify edit daily budget on generate schedule modal for parent child Location Group with w |
| C458556 | Manual | Verify there is no edit budget page show when generate PeerToPeer Location Group  with wee |
| C458558 | Manual | Verify Hrs over budget value on confirm publish schedule modal when publish schedule for p |
| C458559 | Manual | Verify Hrs over budget value on confirm publish schedule modal when publish schedule for P |
| C458563 | Manual | Verify the budget in labor forecast page in Parent Child Location Group when input budget  |
| C458564 | Manual | Verify the budget in overview page in Parent CHild Location Group when input budget by chi |
| C458565 | Manual | Verify the budget in dashboard page in Parent CHild Location Group when input budget by ch |
| C458566 | Manual | Verify the budget on smart smart in Parent CHild Location Group when input budget by child |
| C458567 | Manual | Verify the budget is consistent in different pages in Parent CHild Location Group when inp |
| C458617 | Manual | Verify the budget values display correct on all pages for Parent CHild Location Group when |
| C459574 | Manual | Verify the budget in labor forecast page in Parent Child Location Group when input budget  |
| C459575 | Manual | Verify the budget in overview page in Parent CHild Location Group when input budget by chi |
| C459576 | Manual | Verify the budget in dashboard page in Parent CHild Location Group when input budget by ch |
| C459577 | Manual | Verify the budget on smart smart in Parent CHild Location Group when input budget by child |
| C459578 | Manual | Verify the budget is consistent in different pages in Parent CHild Location Group when inp |
| C459579 | Manual | Verify the budget values display correct on all pages for Parent CHild Location Group when |
| C459581 | Manual | Verify the scheduled hrs and shifts always same with the shifts in master template for pee |
| C459584 | Manual | Verify the scheduled hrs and shifts always same with the shifts in master template for Pee |
| C459640 | Manual | Verify the budget values display correct on all pages for Parent CHild Location Group when |

---

## Indirect Impact
**Total: 96** (Automated: 61 | Manual: 35)

| Case ID | Status | Title |
|---------|--------|-------|
| C452969 | Manual | 1.Verify Published schedules should show correct status on District Overview for Regular l |
| C452971 | Manual | 1.1 Verify Not Started schedules should show correct status on District Overview for Regul |
| C452973 | Manual | 1.2 Verify In Progress(Not Published) schedules should show correct status on District Ove |
| C452976 | Manual | 1.3 Update the Schedule status for any week from Published to Not Started/In Progress to P |
| C452970 | Manual | 2.Verify Published schedules should show correct status on District Overview for Parent Ch |
| C452972 | Manual | 2.1  Verify Not Started schedules should show correct status on District Overview for Pare |
| C452974 | Manual | 2.2 Verify In Progress(Not Published) schedules should show correct status on District Ove |
| C452975 | Manual | 2.3 Update the Schedule status for any week from Published to Not Started/In Progress to P |
| C452979 | Manual | 3_Verify the status of the parent location in District Overview page when a child location |
| C452980 | Manual | 3.1_Verify the status of the parent location in District Overview page when a child locati |
| C452981 | Manual | 4_Verify the status of the parent location in District Overview page when a child location |
| C453006 | Manual | 1_Verify it shows peer sub-location roster employees on Multi-week view tab when any of th |
| C454450 | Manual | 1. Verify Refresh button refreshes & shows the data correctly for locations on District Ma |
| C454451 | Manual | 2. Verify Refresh button refreshes & shows the data correctly for locations on District Ma |
| C65683 | Automated | Verify the System Admin, district manager, Store Manager has the access by default. |
| C360938 | Manual | Verify District Manager can edit past demand forecast after enable the manage past demand  |
| C360939 | Manual | Verify District Manager cannot edit past demand forecast after disable the manage past dem |
| C244562 | Automated | Verify changing district on Overview page |
| C244563 | Automated | Verify changing district on Forecast page |
| C244564 | Automated | Verify changing district on Schedule page |
| C244565 | Automated | Verify searching and selecting district on Overview page |
| C244566 | Automated | Verify searching and selecting district on Forecast page |
| C244567 | Automated | Verify searching and selecting district on Schedule page |
| C244584 | Automated | Verify selecting district on region schedule page |
| C244585 | Automated | Verify selecting location on district schedule tab |
| C244589 | Automated | Verify selecting district on region Compliance page |
| C244590 | Automated | Verify selecting location on district Compliance tab |
| C244592 | Automated | Verify selecting district on SM Compliance page |
| C244593 | Automated | Verify selecting region on district Compliance page |
| C244599 | Automated | Verify selecting district on region Report page |
| C244600 | Automated | Verify selecting location on district Report tab |
| C244601 | Automated | Verify selecting location on district Report tab |
| C244602 | Automated | Verify selecting district on region Report page |
| C244609 | Automated | Verify selecting district on region Report page |
| C244610 | Automated | Verify selecting location on district Report tab |
| C244611 | Automated | Verify selecting location on district Report tab |
| C244612 | Automated | Verify selecting district on region Report page |
| C244619 | Automated | Verify location navigation is not show on Moderation page when selecting district on Newsf |
| C97512 | Automated | Validate the content in District Summary widget |
| C97513 | Automated | Validate district number in District Summary widget |
| C97522 | Automated | Validate the content in District Summary widget |
| C97565 | Automated | Validate the district list |
| C97566 | Automated | Validate click one district |
| C97567 | Automated | Validate go back from one district |
| C97568 | Automated | Validate click given district and given week |
| C97569 | Automated | Validate go back from one district and one week |
| C97600 | Automated | Validate the content of DISTRICT SUMMARY smart card for current/future weeks |
| C97601 | Automated | Validate the data DISTRICT SUMMARY smart card for current/future weeks |
| C97602 | Automated | Validate the content of DISTRICT SUMMARY smart card for past weeks |
| C97603 | Automated | Validate the data on DISTRICT SUMMARY smart card for past weeks |
| C97604 | Automated | Validate the data above Clocked Hrs on DISTRICT SUMMARY smart card for past weeks |
| C97605 | Automated | Validate the data above Projected Hrs on DISTRICT SUMMARY smart card for current/future we |
| C97606 | Automated | Validate tooltip of Scheduled Hrs bar on DISTRICT SUMMARY smart card |
| C97607 | Automated | Validate tooltip of Projected Hrs bar on DISTRICT SUMMARY smart card |
| C97621 | Automated | Validate Schedule Status, Score, Budgeted Hours, Scheduled Hours for selected district |
| C97668 | Automated | Validate the district list |
| C97669 | Automated | Validate click one district |
| C97670 | Automated | Validate the data for selected district |
| C97671 | Automated | Validate go back from selected district in current week |
| C97672 | Automated | Validate click given district and given week |
| C97689 | Automated | Validate changing districts on Compliance |
| C97708 | Automated | Validate the district list |
| C97709 | Automated | Validate click one district |
| C97716 | Automated | Validate the content on Districts
with Violations smart card |
| C97717 | Automated | Validate the data on Districts
with Violations smart card |
| C97750 | Automated | Validate drilling into a district |
| C97753 | Automated | Validate changing dates and district |
| C70546 | Automated | Validate the presence of district |
| C70549 | Automated | Validate changing districts on Dashboard |
| C70591 | Automated | Validate changing districts on Schedule |
| C70620 | Manual | Validate Schedule Score calculating for district on SCHEDULE SCORE smart card |
| C70643 | Automated | Validate changing districts on Timesheet |
| C70665 | Automated | Validate click other district in past week |
| C70672 | Automated | Validate changing districts on Compliance |
| C70697 | Automated | Validate user has access to 1 district |
| C70698 | Automated | Validate user has access to multiple districts |
| C70700 | Automated | Validate navigating back to district view |
| C70701 | Automated | Validate changing districts |
| C449542 | Manual | Validate peerToPeerShiftView under getGlobalSchedulePreferences when Show only shifts for  |
| C452919 | Manual | Validate Peer-to-Peer LG, schedule note in SM view. |
| C452920 | Manual | Validate Peer-to-Peer LG, schedule note in TM view. |
| C452921 | Manual | Validate Peer-to-Peer LG, Copy/ Move shift to another location |
| C452922 | Manual | Validate Peer-to-Peer LG, publish schedule only for one child location, schedule note in S |
| C452923 | Manual | Validate Peer-to-Peer LG, publish schedule only for one child location, schedule note in T |
| C462599 | Manual | Verify the budget values display correct on all pages for PeerToPeer  child location when  |
| C473227 | Manual | Verify the district summary |
| C4605252 | Manual | Verify view schedule as district manager |
| C4616013 | Manual | Verify clopening rules enforced across locations |
| C4616014 | Manual | Verify consecutive day limits enforced across locations |
| C4616015 | Manual | Verify overlapping shifts not created across locations |
| C458533 | Manual | Verify the budget values display correct on all pages for PeertoPeerchild location when en |
| C458535 | Manual | Verify the cannot edit budget on PeerToPeer parent level when enable display budget config |
| C458548 | Manual | Verify the budget values display correct on all pages for PeerToPeer  child location when  |
| C459639 | Manual | Verify the budget values display correct on all pages for PeertoPeerchild location when en |
| C459643 | Manual | Verify the budget values display correct on all pages for PeerToPeer  child location when  |
| C473976 | Manual | Verify that dashboard status,schedule overview status for internal admin at district level |

---

## Recommendation
- Run **114** automated test cases as targeted regression
- Flag **315** manual test cases for QA coverage
- **Coverage gap:** Cross-location auto-transition (new feature, no existing cases)