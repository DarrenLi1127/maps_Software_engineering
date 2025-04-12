# Reflection - Sprint 5.1

## 1.1) Which stakeholder did you choose to prioritize and why?

I chose to prioritize the tenant end user's concerns. As stating by our document,
the application is aimed to allow "allow tenants (the end-users) to report on their landlord 
relationship by dropping pins. The pins indicate that they had a negative landlord experience.". 
If tenants are fear to share their experience, the application would be pointless and the data 
collected would not be reliable.

## 1.2) How did you choose to store user data associated with pins?

I am thinking of store user names as Different IDs rather than exposing their real identities.
Pins will be associated with User IDs, so the system would be able to track who placed which pins.
The pins will have stores timestamp, location and user IDs but real identities. 
This addresses tenant concerns about retribution, but it can still provide some level of 
accountability and data reliability for researchers.

# Reflection - Sprint 5.2

## 1.1) Which stakeholder did you choose to prioritize—the tenant end user or the urban studies research student—and why? What consequences could your choice cause for the other stakeholder?
I prioritized tenant end users by implementing pseudonymous identification. Users can see pins added
by the user himself or by another user rather than displaying real identities. This would encourage 
honest reviews and reporting.
The consequence for research students is limited ability to detect fake reviews or misuse.

## 1.2) How did you choose to persistently store the user data associated with pins and why? Please highlight how your decision addressed the specific concerns raised by the stakeholder that you prioritized.
I store pins with a pseudonymous user ID (from Clerk authentication) rather than real identities, 
along with minimal data (coordinates, timestamp). This approach addresses tenant concerns by using 
non-identifiable tokens and providing easy access for users to manage their pins.