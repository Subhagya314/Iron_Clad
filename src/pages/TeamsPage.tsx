import type { Id } from '../../convex/_generated/dataModel'
import { Icon } from '../components/ui/Icon'

type GroupRow = { group: { _id: Id<'groups'>; name: string; createdAt: number }; role: 'admin' | 'member' }
type MemberRow = {
  _id: Id<'groupMembers'>
  groupId: Id<'groups'>
  userId: string
  role: 'admin' | 'member'
  joinedAt: number
}

type Props = {
  convexReady: boolean
  userEmail: string
  myGroups: GroupRow[] | undefined
  activeGroupId: string | null
  onSelectScope: (groupId: string | null) => void
  newGroupName: string
  onNewGroupNameChange: (v: string) => void
  onCreateGroup: (e: React.FormEvent) => void | Promise<void>
  membersForActiveGroup: MemberRow[] | undefined
  isGroupAdmin: boolean
  addMemberEmail: string
  onAddMemberEmailChange: (v: string) => void
  onAddMember: (e: React.FormEvent) => void | Promise<void>
  memberFeedback: string | null
  onRemoveMember: (targetEmail: string) => void
}

export function TeamsPage({
  convexReady,
  userEmail,
  myGroups,
  activeGroupId,
  onSelectScope,
  newGroupName,
  onNewGroupNameChange,
  onCreateGroup,
  membersForActiveGroup,
  isGroupAdmin,
  addMemberEmail,
  onAddMemberEmailChange,
  onAddMember,
  memberFeedback,
  onRemoveMember,
}: Props) {
  const pill = (selected: boolean) =>
    selected
      ? 'border-secondary bg-secondary font-semibold text-on-secondary'
      : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-high'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold text-on-surface">Teams</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Shared folders for your workspace. Uploads sent to a team appear for every member—you do not need to share each
          file again.
        </p>
      </header>

      <section className="rounded-xl border border-outline-variant bg-surface-bright p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container">
            <Icon name="upload_file" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-on-surface">Where new uploads go</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Choose before you upload from the sidebar. Personal files stay visible only to you.
            </p>
            {!convexReady ? (
              <p className="mt-4 text-xs text-secondary">
                Connect Convex in Settings to enable teams and cloud documents.
              </p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectScope(null)}
                    className={`rounded-lg border px-4 py-2 text-sm transition-colors ${pill(activeGroupId === null)}`}
                  >
                    Personal
                  </button>
                  {myGroups?.map(({ group }) => (
                    <button
                      key={group._id}
                      type="button"
                      onClick={() => onSelectScope(group._id)}
                      className={`rounded-lg border px-4 py-2 text-sm transition-colors ${pill(activeGroupId === group._id)}`}
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
                <form className="mt-6 flex flex-wrap gap-2 border-t border-outline-variant pt-6" onSubmit={(e) => void onCreateGroup(e)}>
                  <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-on-surface-variant">
                    New team name
                    <input
                      value={newGroupName}
                      onChange={(e) => onNewGroupNameChange(e.target.value)}
                      placeholder="e.g. Acme disclosure team"
                      className="rounded-lg border border-outline-variant bg-background px-3 py-2 text-sm text-on-surface"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="rounded-lg border border-outline-variant bg-secondary-container px-4 py-2 text-sm font-semibold text-on-secondary-container hover:opacity-90"
                    >
                      Create team
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-bright p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
            <Icon name="groups" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-on-surface">People on this team</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Admins can invite teammates by email ({userEmail.split('@')[1] ?? 'your domain'} colleagues must sign in with
              the same flow as you).
            </p>

            {!convexReady ? null : activeGroupId === null ? (
              <p className="mt-4 text-sm text-on-surface-variant">
                Select a team above to see who has access and to add members.
              </p>
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {membersForActiveGroup?.map((m) => (
                    <li
                      key={m._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-outline-variant bg-background px-3 py-2 text-sm text-on-surface"
                    >
                      <span className="min-w-0 truncate">
                        {m.userId}
                        {m.role === 'admin' ? (
                          <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                            Admin
                          </span>
                        ) : null}
                      </span>
                      {(isGroupAdmin && m.userId !== userEmail) || m.userId === userEmail ? (
                        <button
                          type="button"
                          className="shrink-0 text-xs font-semibold uppercase tracking-wide text-error hover:underline"
                          onClick={() => onRemoveMember(m.userId)}
                        >
                          {m.userId === userEmail ? 'Leave team' : 'Remove'}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 border-t border-outline-variant pt-6">
                  {isGroupAdmin ? (
                    <form className="flex flex-wrap gap-2" onSubmit={(e) => void onAddMember(e)}>
                      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-on-surface-variant">
                        Invite by email
                        <input
                          type="email"
                          autoComplete="email"
                          value={addMemberEmail}
                          onChange={(e) => onAddMemberEmailChange(e.target.value)}
                          placeholder="colleague@firm.com"
                          className="rounded-lg border border-outline-variant bg-background px-3 py-2 text-sm text-on-surface"
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="rounded-lg border border-outline-variant bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90"
                        >
                          Add member
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-xs text-on-surface-variant">Only admins can add people to this team.</p>
                  )}
                  {memberFeedback ? (
                    <p className="mt-3 text-sm text-error">{memberFeedback}</p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
