import { FileFormat } from "../lib/file-format-spec";
import { CallTreeProfileBuilder, FrameInfo, Profile, ProfileGroup } from "../lib/profile";
import { TimeFormatter } from "../lib/value-formatters";

export function importNetCoreProfiles(file: FileFormat.File, fileName: string): ProfileGroup
{
    const foldType = getFoldType(fileName);

    return {
        name: file.name || file.profiles[0].name || 'profile',
        indexToView: file.activeProfileIndex || 0,
        profiles: file.profiles.map(p => importNetCoreProfile(<FileFormat.EventedProfile>p, file.shared.frames, foldType))
    };
}

function getFoldType(fileName: string): FoldType
{
    const parts = fileName.split(".");

    if (parts.length >= 4)
    {
        const maybeFold = parts[parts.length - 4].toLowerCase();

        switch (maybeFold)
        {
            case "no-cpu":
                return FoldType.CpuTime;

            case "no-cpu-uct":
            case "no-uct-cpu":
                return FoldType.CpuTime | FoldType.UnmanagedCodeTime;

            case "no-uct":
                return FoldType.UnmanagedCodeTime;

            default:
                return FoldType.None;
        }
    }

    return FoldType.None;
}

enum FoldType
{
    None = 0,
    CpuTime = 1,
    UnmanagedCodeTime = 2
}

function importNetCoreProfile(profile: FileFormat.EventedProfile, frames: FileFormat.Frame[], foldType: FoldType): Profile
{
    const { name, startValue, endValue, events } = profile;

    const profileBuilder = new CallTreeProfileBuilder(endValue - startValue);
    profileBuilder.setName(name);
    profileBuilder.setValueFormatter(new TimeFormatter("milliseconds"));

    const cpuTimeFrameId =
        foldType & FoldType.CpuTime ?
            frames.findIndex((f) => f.name === "CPU_TIME") :
                -1;

    const unmanagedCodeTimeFrameId =
        foldType & FoldType.UnmanagedCodeTime ?
            frames.findIndex((f) => f.name === "UNMANAGED_CODE_TIME") :
                -1;

    const frameInfos: FrameInfo[] = frames.map((frame, i) => ({ key: i, ...frame }));

    for (let ev of events)
    {
        const frame = ev.frame;

        if (frame !== cpuTimeFrameId && frame !== unmanagedCodeTimeFrameId)
        {
            switch (ev.type)
            {
                case FileFormat.EventType.OPEN_FRAME:
                    profileBuilder.enterFrame(frameInfos[frame], ev.at - startValue);
                    break;

                case FileFormat.EventType.CLOSE_FRAME:
                    profileBuilder.leaveFrame(frameInfos[frame], ev.at - startValue);
                    break;
            }
        }
    }

    return profileBuilder.build();
}
