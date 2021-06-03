import bpy

file = open("C:\\Users\\hypo\\Desktop\\tv\\images.txt", 'w')
scene = bpy.context.scene

camera_count = 1
for obj in objects:
  if obj.type == "CAMERA":
    loc = obj.location
    qua = obj.rotation_euler.to_quaternion()
    file.write(str(camera_count) + ' ' + str(qua.w) + ' ' + str(qua.x) + ' ' + str(qua.y) + ' ' + str(qua.z) + ' ' + str(loc.x) + ' ' + str(loc.y) + ' ' + str(loc.z) + ' ' + ' ' + str(camera_count) + ' ' + obj.name +'\n')
    camera_count = camera_count + 1

file.close()